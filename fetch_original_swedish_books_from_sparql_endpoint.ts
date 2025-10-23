/**
 * Fetches books from Libris using their SPARQL endpoint
 * If ISBN is available, tries to enhance data with data from goodreads
 */

import { readFile, writeFile } from "fs/promises"
import goodreads, { Goodreads } from "./goodreads.ts"
import { attemptWithTimeout, chunk, getFileOrDownload } from "./helpers.js"
import pLimit from "p-limit"

interface Release {
  title: string
  author: string
  isbn?: string
  genres: Set<string>
}

interface FullRelease extends Required<Release> {
  goodreads: Goodreads
}

async function enhanceReleaseWithDataFromGoodReads(titles: Release[]) {
  const result: (FullRelease | Release)[] = []
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

const FORMAT = "application/sparql-results+json"

const BASE_URL =
  "https://libris.kb.se/sparql?format=FORMAT&should-sponge=soft&query=QUERY"
const QUERY = (await readFile("./query.rq")).toString()

async function loadLibrisSPARQLSearchResults(year: number): Promise<string> {
  const fileName = `json-sparql/${year}.json`
  const url = BASE_URL.replace("FORMAT", encodeURIComponent(FORMAT)).replace(
    "QUERY",
    encodeURIComponent(QUERY.replace("|YEAR|", year.toString()))
  )

  return await getFileOrDownload(fileName, url)
}

export interface SparqlResponse {
  head: Head
  results: Results
}

export interface Head {
  link: any[]
  vars: string[]
}

export interface Results {
  distinct: boolean
  ordered: boolean
  bindings: {
    work: Value
    instance: Value
    title: Value
    givenName: Value
    familyName: Value
    isbn?: Value
    gf: Value
  }[]
}

export interface Value {
  type: Type
  value: string
}

export enum Type {
  Bnode = "bnode",
  Literal = "literal",
  URI = "uri",
}

const invalidGenres = new Set([
  "https://id.kb.se/marc/Poetry",
  "https://id.kb.se/term/saogf/Poesi",
  "https://id.kb.se/marc/NotFictionNotFurtherSpecified",
])

async function findTitlesPublishedInYear(year: number): Promise<Release[]> {
  const data = await loadLibrisSPARQLSearchResults(year)
  const parse = JSON.parse(data) as SparqlResponse

  // We get one row per genre of the work
  return (
    parse.results.bindings
      .reduce<{ invalid: Set<string>; valid: Map<string, Release> }>(
        (acc, x) => {
          const { invalid, valid } = acc

          if (invalid.has(x.work.value)) return acc

          // Ignore works without a valid reference
          if (x.work.type === Type.Bnode) {
            invalid.add(x.work.value)
            return acc
          }

          if (invalidGenres.has(x.gf.value)) {
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
      // Ignore any title that only has a single genre of some node id
      .filter((x) => [...x.genres].some((g) => !g.startsWith("nodeID://b")))
      .toArray()
  )
}

function makeSetsSerializable(_: string, value: any) {
  // Sets can not be stringified by default, so we need to convert it to a regular array first
  if (value instanceof Set) return [...value]
  return value
}

function hasGoodReadsData(items: object[]) {
  return items.reduce((acc, x) => acc + ("goodreads" in x ? 1 : 0), 0)
}

const STARTING_YEAR = 1850
const END_YEAR = 2024

// The SPARQL endpoint takes around 30 seconds for each response,
// so we start 20 requests in parallel
const limit = pLimit(20)

const tasks = [...Array(END_YEAR - STARTING_YEAR)].map((_, i) =>
  limit(async function () {
    const year = STARTING_YEAR + i

    console.log(`Fetching releases for year ${year}`)
    const result = await findTitlesPublishedInYear(year)
    const enhanced = await enhanceReleaseWithDataFromGoodReads(result)

    console.log(
      `Found ${enhanced.length} releases, of which ${hasGoodReadsData(
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
