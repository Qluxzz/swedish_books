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

function isValidRow(row: Element) {
  const items = row.getElementsByTagName("li")

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

async function findTitlesPublishedInYear(year: number) {
  const html = await loadData(year)

  const { document } = new JSDOM(html).window

  return Array.from(
    document.querySelectorAll(".trafftabell tr td:nth-child(3)")
  )
    .filter((row) => isValidRow(row))
    .map((row) => {
      const items = Array.from(row.querySelectorAll("li"))
      let title = row.querySelector("a")?.textContent

      if (title) {
        const lastSlashInTitle = title.lastIndexOf("/")
        if (lastSlashInTitle !== -1)
          title = title.substring(0, lastSlashInTitle)
      }

      const [author, lifeDate] = formatAuthor(items[0])

      switch (items.length) {
        case 4:
        case 5:
          return [title?.trim(), author, lifeDate]

        default:
          throw new Error("Unhandled number of info rows!")
      }
    })
}

const LIMIT = 10_000
const LIBRARY = "GBG"
// Returns all books from that year available in Gothenburg
const BASE_URL = `https://libris.kb.se/hitlist?f=simp&q=år:YEAR&r=;tree:H;spr:swe;mat:(bok);ocode:(${LIBRARY})&m=${LIMIT}&s=b&d=libris&t=v&g=&p=1`

async function loadData(year: number): Promise<string> {
  try {
    const disk = await fs.readFile(`html/${year}.html`)
    console.info(`Using cached file for year ${year}`)
    return disk.toString()
  } catch {
    console.info("Failed to get cached file, downloading from libris")
    const url = BASE_URL.replace("YEAR", year.toString())

    console.info(url)

    const resp = await fetch(url)

    if (resp.status !== 200) throw new Error("Request was not successful!")

    const html = await resp.text()

    await fs.writeFile(`html/${year}.html`, html)

    return html
  }
}

const STARTING_YEAR = 1950
const END_YEAR = 2000

for (let i = STARTING_YEAR; i <= END_YEAR; ++i) {
  console.log(`Fetching releases for year ${i}`)

  try {
    const data = await findTitlesPublishedInYear(i)

    console.log(`Found ${data.length} releases`)

    await fs.writeFile(`json/${i}.json`, JSON.stringify(data, null, 4))
  } catch (error) {
    console.log(`Failed to get releases for year ${i}`)
    throw error
  }
}
