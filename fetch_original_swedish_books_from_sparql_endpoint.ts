/**
 * Fetches books from Libris using their SPARQL endpoint
 * Tries to enhance data with data from goodreads using the ISBN or a combination of title and author
 */

import { writeFile } from "fs/promises"
import { Goodreads, enhanceWithDataFromGoodReads } from "./goodreads.ts"
import { isValidISBN, log, throwError } from "./helpers.js"
import pLimit from "p-limit"
import { loadLibrisSPARQLSearchResults, Type } from "./sparql.ts"

function makeSetsSerializable(_: string, value: any) {
  // Sets can not be stringified by default, so we need to convert it to a regular array first
  if (value instanceof Set) return [...value]
  return value
}

function hasGoodReadsData(items: object[]) {
  return items.reduce((acc, x) => acc + ("goodreads" in x ? 1 : 0), 0)
}

interface Release {
  title: string
  authorId: string
  author: string
  lifeSpan?: string
  isbn?: string
  genres: Set<string>
  goodreads?: Goodreads
}

const UNWANTED_GENRES = new Set([
  "https://id.kb.se/marc/Autobiography",
  "https://id.kb.se/marc/ComicOrGraphicNovel",
  "https://id.kb.se/marc/ComicStrip",
  "https://id.kb.se/marc/Encyclopedia",
  "https://id.kb.se/marc/Essay",
  "https://id.kb.se/marc/NotFictionNotFurtherSpecified",
  "https://id.kb.se/marc/Poetry",
  "https://id.kb.se/marc/Review",
  "https://id.kb.se/marc/Thesis",
  "https://id.kb.se/marc/Yearbook",
  "https://id.kb.se/term/gmgpc/swe/Tecknade%20serier",
  "https://id.kb.se/term/saogf/Allegorier",
  "https://id.kb.se/term/saogf/Bildverk",
  "https://id.kb.se/term/saogf/Biografier",
  "https://id.kb.se/term/saogf/L%C3%A4romedel",
  "https://id.kb.se/term/saogf/Ljudb%C3%B6cker",
  "https://id.kb.se/term/saogf/Ljudbearbetningar",
  "https://id.kb.se/term/saogf/Ordspr%C3%A5k%20och%20tales%C3%A4tt",
  "https://id.kb.se/term/saogf/Poesi",
  "https://id.kb.se/term/saogf/Sj%C3%A4lvbiografier",
  "https://id.kb.se/term/saogf/Tecknade%20serier",
])

async function findTitlesPublishedInYear(year: number): Promise<Release[]> {
  const data = await loadLibrisSPARQLSearchResults(year)

  // We get one row per genre of the work
  return (
    data.results.bindings
      .reduce<{ invalid: Set<string>; valid: Map<string, Release> }>(
        (acc, x) => {
          const { invalid, valid } = acc

          if (invalid.has(x.work.value)) return acc

          // Skip adding if genre is bNode, if it shows up under another genre, we will add it then
          if (x.genre.type === Type.Bnode) return acc

          // Ignore unwanted genres
          if (
            x.genre.value.startsWith("https://id.kb.se/term/barn") ||
            x.genre.value.startsWith("https://id.kb.se/term/gmgpc") ||
            UNWANTED_GENRES.has(x.genre.value)
          ) {
            invalid.add(x.work.value)

            // Since we get one row per genre we might have added a previous instance
            // before we know it was invalid, so we remove it
            valid.delete(x.work.value)

            return acc
          }

          const existing = valid.get(x.work.value)
          if (existing) existing.genres.add(x.genre.value)
          else {
            valid.set(x.work.value, {
              title: x.title.value,
              authorId:
                x.author.value.split("/").pop()?.split("#").at(0) ??
                throwError(
                  `${x.author.value} could not be converted to just an author id!`
                ),
              author: `${x.givenName.value} ${x.familyName.value}`,
              lifeSpan: x.lifeSpan?.value,
              genres: new Set<string>([x.genre.value]),
              isbn: x.isbn?.value,
            })
          }

          return acc
        },
        { invalid: new Set<string>(), valid: new Map() }
      )
      .valid.values()
      // Validate ISBN
      .map((x) => {
        if (x.isbn) {
          const { result, normalized } = isValidISBN(x.isbn)

          if (!result) {
            console.error(
              `Book ${x.title} by ${x.author} had an invalid ISBN (${x.isbn}) `
            )

            x.isbn = undefined
          } else {
            x.isbn = normalized
          }
        }

        return x
      })
      .toArray()
  )
}

const STARTING_YEAR = 1850
const END_YEAR = 2024

// The SPARQL endpoint takes around 50 seconds for each response,
// so we start 20 requests in parallel
const limit = pLimit(40)

const tasks = [...Array(END_YEAR - STARTING_YEAR + 1)].map((_, i) =>
  limit(async function () {
    const year = STARTING_YEAR + i
    try {
      log(`${year}: Fetching titles`)
      const result = await findTitlesPublishedInYear(year)
      log(`${year}: Try to add Goodreads data`)
      const enhanced = await enhanceWithDataFromGoodReads(result)

      log(
        `${year}: Found ${
          enhanced.length
        } releases, of which ${hasGoodReadsData(
          enhanced
        )} releases were found on Goodread`
      )

      if (enhanced.length !== 0)
        await writeFile(
          `json/${year}.json`,
          JSON.stringify(enhanced, makeSetsSerializable, 2)
        )
    } catch (error) {
      log(`${year}: Failed to fetch releases for year. ${error}`)
    }
  })
)

await Promise.all(tasks)

log("Done!")
