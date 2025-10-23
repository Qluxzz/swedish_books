/**
 * Fetches books from Libris using their SPARQL endpoint
 * Tries to enhance data with data from goodreads using the ISBN or a combination of title and author
 */

import { writeFile } from "fs/promises"
import goodreads, { Goodreads } from "./goodreads.ts"
import { attemptWithTimeout, chunk } from "./helpers.js"
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

async function enhanceReleaseWithDataFromGoodReads(titles: Release[]) {
  const result: Release[] = []
  const chunks = chunk(
    titles.map((x) => async () => {
      const result = x.isbn
        ? await goodreads.getByISBN(x.isbn)
        : await goodreads.getByTitleAndAuthor(x.title, x.author)
      if (result) return { ...x, goodreads: result }

      return x
    }),
    10
  )

  for (const chunk of chunks) {
    const res = await attemptWithTimeout(() =>
      Promise.all(chunk.map((f) => f()))
    )

    result.push(...res)
  }

  return result
}

interface Release {
  title: string
  author: string
  isbn?: string
  genres: Set<string>
  goodreads?: Goodreads
}

async function findTitlesPublishedInYear(year: number): Promise<Release[]> {
  const data = await loadLibrisSPARQLSearchResults(year)

  // We get one row per genre of the work
  return data.results.bindings
    .reduce<{ invalid: Set<string>; valid: Map<string, Release> }>(
      (acc, x) => {
        const { invalid, valid } = acc

        if (invalid.has(x.work.value)) return acc

        // Ignore works without a valid reference
        if (x.work.type === Type.Bnode) {
          invalid.add(x.work.value)
          return acc
        }

        // Skip adding if genre is bNode, if it shows up under another genre, we will add it then
        if (x.gf.type === Type.Bnode) return acc

        // Ignore all children's books
        if (x.gf.value.startsWith("https://id.kb.se/term/barngf")) {
          invalid.add(x.work.value)
          return acc
        }

        if (INVALID_GENRES.has(x.gf.value)) {
          invalid.add(x.work.value)
          // Since we get one row per genre we might have added a previous instance
          // before we know it was invalid, so we remove it
          valid.delete(x.work.value)

          return acc
        }

        const existing = valid.get(x.work.value)
        if (existing) existing.genres.add(x.gf.value)
        else
          valid.set(x.work.value, {
            title: x.title.value,
            author: `${x.givenName.value} ${x.familyName.value}`,
            genres: new Set<string>([x.gf.value]),
            isbn: x.isbn?.value,
          })

        return acc
      },
      { invalid: new Set<string>(), valid: new Map() }
    )
    .valid.values()
    .toArray()
}

const INVALID_GENRES = new Set([
  "https://id.kb.se/marc/ComicOrGraphicNovel",
  "https://id.kb.se/marc/ComicStrip",
  "https://id.kb.se/marc/Encyclopedia",
  "https://id.kb.se/marc/Essay",
  "https://id.kb.se/marc/NotFictionNotFurtherSpecified",
  "https://id.kb.se/marc/Poetry",
  "https://id.kb.se/marc/Yearbook",
  "https://id.kb.se/term/gmgpc/swe/Tecknade%20serier",
  "https://id.kb.se/term/saogf/Allegorier",
  "https://id.kb.se/term/saogf/Bildverk",
  "https://id.kb.se/term/saogf/Ljudb%C3%B6cker",
  "https://id.kb.se/term/saogf/Ljudbearbetningar",
  "https://id.kb.se/term/saogf/Poesi",
  "https://id.kb.se/term/saogf/Tecknade%20serier",
])

const STARTING_YEAR = 1850
const END_YEAR = 2024

// The SPARQL endpoint takes around 30 seconds for each response,
// so we start 20 requests in parallel
const limit = pLimit(20)

const tasks = [...Array(END_YEAR - STARTING_YEAR + 1)].map((_, i) =>
  limit(async function () {
    const year = STARTING_YEAR + i

    console.log(`${year}: Fetching titles`)
    const result = await findTitlesPublishedInYear(year)
    console.log(`${year}: Try to add Goodreads data`)
    const enhanced = await enhanceReleaseWithDataFromGoodReads(result)

    console.log(
      `${year}: Found ${enhanced.length} releases, of which ${hasGoodReadsData(
        enhanced
      )} releases were found on Goodread`
    )

    if (enhanced.length !== 0)
      await writeFile(
        `json/${year}.json`,
        JSON.stringify(enhanced, makeSetsSerializable, 2)
      )
  })
)

await Promise.all(tasks)

console.info("Done!")
