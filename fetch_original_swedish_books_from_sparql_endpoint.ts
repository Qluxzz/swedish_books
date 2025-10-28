/**
 * Fetches books from Libris using their SPARQL endpoint
 * Tries to enhance data with data from goodreads using the ISBN or a combination of title and author
 */

import crypto from "node:crypto"
import { writeFile } from "fs/promises"
import { Goodreads, getDataFromGoodReads } from "./goodreads.ts"
import { isValidISBN, log, throwError } from "./helpers.js"
import PQueue from "p-queue"
import {
  loadLibrisSPARQLSearchResults,
  SparqlResponse,
  Type,
} from "./sparql.ts"

function makeSetsSerializable(_: string, value: any) {
  // Sets can not be stringified by default, so we need to convert it to a regular array first
  if (value instanceof Set) return [...value]
  return value
}

function hasGoodReadsData(items: object[]) {
  return items.reduce((acc, x) => acc + ("goodreads" in x ? 1 : 0), 0)
}

interface Release {
  /**
   * The unique work id that all instances has as a parent
   */
  workId: string
  title: string
  authorId: string
  author: string
  lifeSpan?: string
  isbn?: string
  genres: Set<string>
  /**
   * This is the unique instance ids per work
   * This can be used to fetch the image for the work, if we don't get it from Goodreads
   */
  instances: Set<string>
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

function parseSparqlResult(data: SparqlResponse): Release[] {
  // The rows are duplicated once for genre, and for instance of a work
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
          if (existing) {
            existing.genres.add(x.genre.value)
            existing.instances.add(x.instance.value)
          } else {
            const authorId =
              // Best case, we have an URI for the author and we use that as the id
              x.author.type === Type.URI
                ? x.author.value.split("/").pop()?.split("#").at(0) ??
                  throwError(
                    `${x.author.value} could not be converted to just an author id!`
                  )
                : // Otherwise we use the isni if available
                  // And in last case we hash together the name and lifespan of the author
                  x.isni?.value ??
                  crypto.hash(
                    "sha1",
                    `${x.givenName.value}${x.familyName.value}${x.lifeSpan?.value}`
                  )

            valid.set(x.work.value, {
              workId: x.work.value,
              title: x.title.value,
              authorId,
              author: `${x.givenName.value} ${x.familyName.value}`,
              lifeSpan: x.lifeSpan?.value,
              genres: new Set<string>([x.genre.value]),
              isbn: x.isbn?.value,
              instances: new Set<string>([x.instance.value]),
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

// SPARQL Data
const sparqlQueue = new PQueue({ concurrency: 10 })
sparqlQueue.addAll(
  [...Array(END_YEAR - STARTING_YEAR + 1)].map((_, i) => async () => ({
    year: STARTING_YEAR + i,
    data: await loadLibrisSPARQLSearchResults(STARTING_YEAR + i),
  }))
)

const goodReadsQueue = new PQueue({ concurrency: 20 })

const parsedTitlesPerYear: { year: number; titles: Release[] }[] = []

sparqlQueue.on(
  "completed",
  ({ year, data }: { year: number; data: SparqlResponse }) => {
    const titles = parseSparqlResult(data)
    parsedTitlesPerYear.push({ year, titles })

    goodReadsQueue.addAll(
      titles.map((book) => async () => {
        const data = await getDataFromGoodReads(book)
        if (data) {
          return {
            work: book.workId,
            goodreads: data,
          }
        }
        return null
      })
    )
  }
)

const goodreads = new Map<string, Goodreads>()
goodReadsQueue.on(
  "completed",
  (data: { work: string; goodreads: Goodreads | null }) => {
    if (data.goodreads) goodreads.set(data.work, data.goodreads)
  }
)

await sparqlQueue.onIdle()
log("All sparqle requests are done!")
await goodReadsQueue.onIdle()
log("All goodreads requests are done!")

const fileQueue = new PQueue({ concurrency: 20 })
fileQueue.addAll(
  parsedTitlesPerYear.map(({ year, titles }) => async () => {
    const enhanced = titles.map((title) => {
      const g = goodreads.get(title.workId)
      if (g) title.goodreads = g
      return title
    })

    if (enhanced.length !== 0)
      await writeFile(
        `json/${year}.json`,
        JSON.stringify(enhanced, makeSetsSerializable, 2)
      )
  })
)

await fileQueue.onIdle()

log("Done!")
