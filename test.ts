import fetch from "node-fetch"
import { JSDOM } from "jsdom"
import fs from "node:fs/promises"

const LIFE_DATE = /(\d{4})-(\d{4})?/

function authorWasAliveWhenBookWasPublished(year: number, row: HTMLElement) {
  const res = LIFE_DATE.exec(row.textContent)
  // Ignore authors without age
  if (!res) return false

  const [_, birth, death] = res

  if (!death && Number.parseInt(birth) - year < 100) return true

  return Number.parseInt(death) > year
}

const filtered = [
  "Barn/ungdom",
  "översättning",
  "översatt",
  "återberättad",
  "tolkad",
  "Läromedel",
  "svensk tolkning",
  "Lyrik",
  "till svenska",
  "övers.",
]

function isValidRow(row: Element): boolean {
  const items = row.querySelectorAll("td:nth-child(3) li")

  // Ignore rows which doesn't have enough info to judge them by
  if (!(items.length === 4 || items.length === 5)) return false

  let [author, originalTitle, title, type] = [
    items.item(0)?.textContent,
    items.length === 5 ? items.item(1) : null,
    items.item(items.length === 4 ? 1 : 2)?.textContent.toLowerCase(),
    items.item(items.length === 4 ? 3 : 4)?.textContent.toLowerCase(),
  ]

  if (!author || !title || !type) return false

  // This is a translated title, ignore
  if (originalTitle?.textContent.toLowerCase().includes("svenska")) return false

  if (type.includes("barn/ungdom")) return false

  if (filtered.some((f) => title?.includes(f))) return false

  if (!LIFE_DATE.test(author)) return false

  return true
}

function formatAuthor(element: Element): [string, string?] {
  const text = element.textContent

  const lastComma = text.lastIndexOf(",")
  const name = text.substring(0, lastComma)
  const lifeDate = LIFE_DATE.exec(text.substring(lastComma))?.[0]

  return [name, lifeDate]
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

async function findTitlesPublishedInYear(year: number) {
  let hasNextPage = true
  let page = 1

  const results = []
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
        .filter((row) => isValidRow(row))
        .map((row) => {
          const pictureUrl =
            row.querySelector("td.cover img")?.getAttribute("src") ??
            throwError("Failed to get image url!")

          const ids = getIdsFromImageUrl(pictureUrl)

          const info =
            row.querySelector("td:nth-child(3)") ??
            throwError("Failed to get info for book!")

          const items = info.querySelectorAll("li")
          let title = info.querySelector("a")?.textContent

          if (title) {
            const lastSlashInTitle = title.lastIndexOf("/")
            if (lastSlashInTitle !== -1)
              title = title.substring(0, lastSlashInTitle).trim()
          }

          const [author, lifeDate] = formatAuthor(items[0])

          switch (items.length) {
            case 4:
            case 5:
              return [title, author, lifeDate, ids.isbn]

            default:
              throw new Error("Unhandled number of info rows!")
          }
        })
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

    if (resp.status !== 200)
      throw new Error(
        `Request was not successful! Status code was ${resp.status}`
      )

    const html = await resp.text()

    await fs.writeFile(fileName, html)

    return html
  }
}

const STARTING_YEAR = 1850
const END_YEAR = 2024

for (let i = STARTING_YEAR; i <= END_YEAR; ++i) {
  console.log(`Fetching releases for year ${i}`)

  try {
    const data = await findTitlesPublishedInYear(i)

    console.log(`Found ${data.length} releases`)

    if (data.length !== 0)
      await fs.writeFile(`json/${i}.json`, JSON.stringify(data, null, 2))
  } catch (error) {
    console.log(`Failed to get releases for year ${i}`)
    throw error
  }
}
