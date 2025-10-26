/**
 * Fetches books from Libris web UI
 * If ISBN is available, tries to enhance data with data from goodreads
 *
 * Why this doesn't work?
 * Libris isn't strict enough in what it considers translated works,
 * even though I have tried to filter only swedish original titles,
 * we still get works by Tolstoy and american authors in the response,
 * with no way to dicern these as translated.
 */

import { JSDOM } from "jsdom"
import fs from "node:fs/promises"
import { getFileOrDownload } from "./helpers.js"
import { enhanceWithDataFromGoodReads } from "./goodreads.js"

const translated = [
  "översättning",
  "översatt",
  "återberättad",
  "tolkad",
  "svensk tolkning",
  "till svenska",
  "övers.",
  "öfversättning",
  "från engelskan",
]

const ignored = ["Läromedel", "lyrik", ": dikter", ": dikt"]

function getAuthorName(authorAndLifeDate: string): string {
  const lastComma = authorAndLifeDate.lastIndexOf(",")
  if (lastComma === -1) {
    const name = authorAndLifeDate.split("\n").at(0)?.trim()

    if (name === undefined)
      throw new Error(
        "Expected author and life date text to contain at least one (,)"
      )
    else return name
  }

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

function noResultsFound(document: Document): boolean {
  return (
    document.querySelector("h2.alert")?.textContent ===
    "Denna avgränsning gav inga träffar"
  )
}

async function findTitlesPublishedInYear(year: number): Promise<Release[]> {
  let hasNextPage = true
  let page = 1

  const results: Release[] = []
  while (hasNextPage) {
    const html = await loadLibrisSearchResults(year, page)

    const { document } = new JSDOM(html).window

    if (document.querySelector("div#fullpost"))
      // Only a single result was returned,
      // which instead of returning a search results page,
      // returns the info page for that single result directly
      // We don't currently handle the parsing for this
      return []

    if (noResultsFound(document)) return []

    hasNextPage = getHasNextPage(document)

    results.push(
      ...Array.from(document.querySelectorAll(".trafftabell tr"))
        .map((row) => {
          const items = row.querySelectorAll("td:nth-child(3) li")

          // Ignore rows which doesn't have enough info to judge them by
          if (!(items.length === 4 || items.length === 5)) return null

          let { authorAndLifeDate, originalTitle, title, type } = {
            authorAndLifeDate: items.item(0)?.textContent,
            originalTitle:
              items.length === 5
                ? items.item(1)?.textContent.toLowerCase()
                : null,
            title: items.item(items.length === 4 ? 1 : 2)?.textContent,
            type: items
              .item(items.length === 4 ? 3 : 4)
              ?.textContent.toLowerCase(),
          }

          if (!authorAndLifeDate || !title || !type) return null

          // Some rows have the title as the first item data, and no author info
          if (authorAndLifeDate.includes("[")) return null

          // This is a translated release, ignore
          if (originalTitle?.includes("svenska")) return null

          if (type.includes("barn/ungdom")) return null

          if (translated.some((f) => title?.includes(f))) return null

          if (ignored.some((f) => title?.includes(f))) return null

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
const BASE_URL = `https://libris.kb.se/hitlist?f=simp&q=TREE:Hc&r=;tree:Hc;spr:swe;mat:(bok);srt2:YEAR&m=${LIMIT}&s=b&d=libris&t=v&g=&p=PAGE`

async function loadLibrisSearchResults(
  year: number,
  page: number
): Promise<string> {
  const fileName = `html/${year}-${page}.html`
  const url = BASE_URL.replace("YEAR", year.toString()).replace(
    "PAGE",
    page.toString()
  )

  return await getFileOrDownload(fileName, url)
}

interface Release {
  title: string
  author: string
  librisId: string
  isbn?: string
}

function hasGoodReadsData(items: object[]) {
  return items.reduce((acc, x) => acc + ("goodreads" in x ? 1 : 0), 0)
}

const STARTING_YEAR = 1850
const END_YEAR = 2024

for (let i = STARTING_YEAR; i <= END_YEAR; ++i) {
  console.log(`Fetching releases for year ${i}`)

  const result = await enhanceWithDataFromGoodReads(
    await findTitlesPublishedInYear(i)
  )

  console.log(
    `Found ${result.length} releases, of which ${hasGoodReadsData(
      result
    )} releases were found on Goodread`
  )

  if (result.length !== 0)
    await fs.writeFile(`json/${i}.json`, JSON.stringify(result, null, 2))
}
