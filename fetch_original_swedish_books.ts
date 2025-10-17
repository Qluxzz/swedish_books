import fetch from "node-fetch"
import { JSDOM } from "jsdom"
import fs from "node:fs/promises"
import { chunk, ensureSuccessStatusCode, timeout } from "./helpers.js"

const filtered = [
  "översättning",
  "översatt",
  "återberättad",
  "tolkad",
  "Läromedel",
  "svensk tolkning",
  "lyrik",
  "till svenska",
  "övers.",
]

function getAuthorName(authorAndLifeDate: string): string {
  const lastComma = authorAndLifeDate.lastIndexOf(",")
  if (lastComma === -1)
    throw new Error(
      "Expected author and life date text to contain at least one (,)"
    )

  return authorAndLifeDate.substring(0, lastComma).trim()
}

const LIBRIS_ID = /libris-bib:([^,]+)/
const ISBN = /isbn:(\d+)/

function getIdsFromImageUrl(imageUrl: string): {
  bib: string
  isbn?: string
} {
  const bib =
    LIBRIS_ID.exec(imageUrl)?.at(1) ??
    throwError(`Failed to get libris book id from URL ${imageUrl}!`)

  const isbn = ISBN.exec(imageUrl)?.at(1)

  return { bib, isbn }
}

async function findTitlesPublishedInYear(year: number): Promise<Release[]> {
  let hasNextPage = true
  let page = 1

  const results: Release[] = []
  while (hasNextPage) {
    const html = await loadData(year, page)

    const { document } = new JSDOM(html).window

    if (document.querySelector("div#fullpost"))
      // Only a single result was returned
      return []

    if (
      document.querySelector("h2.alert")?.textContent ===
      "Denna avgränsning gav inga träffar"
    )
      return []

    hasNextPage = getHasNextPage(document)

    results.push(
      ...Array.from(document.querySelectorAll(".trafftabell tr"))
        .map((row) => {
          const items = row.querySelectorAll("td:nth-child(3) li")

          // Ignore rows which doesn't have enough info to judge them by
          if (!(items.length === 4 || items.length === 5)) return null

          let { authorAndLifeDate, originalTitle, title, type } = {
            authorAndLifeDate: items.item(0)?.textContent,
            originalTitle: items.length === 5 ? items.item(1) : null,
            title: items.item(items.length === 4 ? 1 : 2)?.textContent,
            type: items
              .item(items.length === 4 ? 3 : 4)
              ?.textContent.toLowerCase(),
          }

          if (!authorAndLifeDate || !title || !type) return null

          // This is a translated release, ignore
          if (originalTitle?.textContent.toLowerCase().includes("svenska"))
            return null

          if (type.includes("barn/ungdom")) return null

          if (filtered.some((f) => title?.includes(f))) return null

          const pictureUrl =
            row.querySelector("td.cover img")?.getAttribute("src") ??
            throwError("Failed to get image url!")

          const ids = getIdsFromImageUrl(pictureUrl)

          const lastSlashInTitle = title.lastIndexOf("/")
          if (lastSlashInTitle !== -1)
            title = title.substring(0, lastSlashInTitle)

          const author = getAuthorName(authorAndLifeDate)

          return {
            title: title.trim(),
            author,
            librisId: ids.bib,
            isbn: ids.isbn,
          }
        })
        .filter((x) => x !== null)
    )

    page++
  }

  return results
}

function throwError(message: string): never {
  throw new Error(message)
}

const paginationRegex = /Resultat (\d+)-(\d+) av (\d+)/

function getHasNextPage(doc: Document) {
  const elem = doc.querySelector(".blabox li[class='txt noborder']")
  if (!elem) throw new Error("Failed to find pagination info")

  const matches = paginationRegex.exec(elem.textContent)

  const from = matches?.at(1)
  const to = matches?.at(2)
  const of = matches?.at(3)

  if (!(from && to && of)) throw new Error("Failed to parse pagination info")

  return Number.parseInt(to) < Number.parseInt(of)
}

const LIMIT = 1000
const LIBRARY = "GBG"
// Returns all books from that year available in Gothenburg
const BASE_URL = `https://libris.kb.se/hitlist?f=simp&q=år:YEAR&r=;tree:H;spr:swe;mat:(bok);ocode:(${LIBRARY})&m=${LIMIT}&s=b&d=libris&t=v&g=&p=PAGE`

async function loadData(year: number, page: number): Promise<string> {
  const fileName = `html/${year}-${page}.html`

  try {
    const disk = await fs.readFile(fileName)
    console.info(`Using cached file for year ${year} page ${page}`)
    return disk.toString()
  } catch {
    console.info("Failed to get cached file, downloading from libris")
    const url = BASE_URL.replace("YEAR", year.toString()).replace(
      "PAGE",
      page.toString()
    )

    console.info(url)

    const resp = await fetch(url)

    ensureSuccessStatusCode(resp)

    const html = await resp.text()

    await fs.writeFile(fileName, html)

    return html
  }
}

interface GoodreadsData {
  avgRating: string
  ratingsCount: number
  numPages: number
}

interface Release {
  title: string
  author: string
  librisId: string
  isbn?: string
}

interface FullRelease extends Required<Release> {
  goodreads: GoodreadsData
}

async function getReleaseDataFromGoodReads(
  isbn: string
): Promise<GoodreadsData | null> {
  try {
    const local = await fs.readFile(`goodreads/${isbn}.json`)
    return JSON.parse(local.toString())
  } catch {
    const response = await fetch(
      `https://www.goodreads.com/book/auto_complete?format=json&q=${isbn}`
    )

    ensureSuccessStatusCode(response)

    const json = (await response.json()) as GoodreadsData[]

    const first = json.at(0)
    if (!first) return null

    await fs.writeFile(`goodreads/${isbn}.json`, JSON.stringify(first))

    return first
  }
}

const STARTING_YEAR = 1850
const END_YEAR = 2024

for (let i = STARTING_YEAR; i <= END_YEAR; ++i) {
  console.log(`Fetching releases for year ${i}`)

  try {
    const data = await findTitlesPublishedInYear(i)

    console.log(`Found ${data.length} releases`)

    const result: (FullRelease | Release)[] = []
    const chunks = chunk(
      data.map((x) => async () => {
        if (!x.isbn) return x

        const goodreads = await getReleaseDataFromGoodReads(x.isbn)
        if (goodreads) return { ...x, goodreads }

        return x
      }),
      10
    )

    for (const chunk of chunks) {
      while (true) {
        try {
          const res = await Promise.all(chunk.map((f) => f()))
          result.push(...res)
          break
        } catch {
          console.info(
            "Request failed, waiting for two seconds before trying again"
          )
          await timeout(2000)
        }
      }
    }

    if (result.length !== 0)
      await fs.writeFile(`json/${i}.json`, JSON.stringify(result, null, 2))
  } catch (error) {
    console.log(`Failed to get releases for year ${i}`)
  }
}
