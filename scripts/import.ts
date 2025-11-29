/**
 * After running fetch_original_swedish_books.ts, run this to convert that into an SQLite database
 */

import { readdirSync, readFileSync, existsSync, unlinkSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { Image, Instance, Release } from "./utils/release.ts"
import { getIdentifier, throwError } from "./utils/helpers.ts"
import path from "node:path"
import getSlug from "./utils/slug.ts"
import { exit } from "node:process"

// Functions

function setupDatabaseTables(db: DatabaseSync) {
  db.exec(`
CREATE TABLE authors (
  id INTEGER PRIMARY KEY,
  libris_id TEXT UNIQUE NOT NULL,
  name TEXT GENERATED ALWAYS AS (CONCAT(given_name, ' ', family_name)) STORED,
  given_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  life_span TEXT
);
`)

  db.exec(`
CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  isbn TEXT NULL,
  pages INTEGER NOT NULL,
  instances INTEGER NOT NULL DEFAULT 1,
  UNIQUE (slug, author_id)
);
`)

  db.exec(`
CREATE TABLE book_covers (
  id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE UNIQUE,
  host TEXT NOT NULL,
  image_id TEXT NOT NULL
);
`)

  db.exec(`
CREATE TABLE goodreads (
  id INTEGER PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE UNIQUE,
  avg_rating INTEGER NOT NULL,
  ratings INTEGER NOT NULL,
  book_url TEXT NOT NULL
);
`)
}

const currentYear = new Date().getFullYear()
const yearRegex = /\d{4}/g

function getBookCover(
  image: Image,
  book: Release
): { host: string; id: string } | null {
  const host =
    image.host.split("/").pop() ?? throwError("Failed to get image host")

  switch (host) {
    case "tomasgift":
    case "kb":
      if (!image.bib)
        throw new Error("Image requires a bib, but image doesn't have any!")
      return {
        host: host,
        id: getIdentifier(image.bib) ?? throwError("Failed to get bib id"),
      }
    case "bokrondellen":
    case "librisse":
      if (!image.isbn)
        throw new Error(
          `Image host "${host}" requires ISBN, but image doesn't have any! ${JSON.stringify(
            book
          )}`
        )
      return { host: host, id: image.isbn }

    case "digi":
    case "author":
    // This is just a photo of the author, nothing we want
    case "nielsen":
    // Not sure about this, using isbn returns a different title when tested
    case "sesam":
    // Example id, no way to find it in the existing data
    // https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/sesam/isbn/9189144325/I_364572_20061019105257.jpg/orginal
    case "libris":
      // Example id, no way to find it in the existing data
      // https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/libris/libris-bib/7650115/91-7588-130-6B.jpg/orginal
      return null

    default:
      throw new Error(`Unknown image host: ${host}. ${JSON.stringify(book)}`)
  }
}

const pageRegex = new RegExp(/((\d{2,4})|(\d|)\]? (s\.|sidor))/)
function parsePageCount(pagesString: string): number | null {
  const match = pagesString.match(pageRegex)

  if (!match?.at(1)) return null

  const parsed = Number.parseInt(match?.[1])

  return Number.isNaN(parsed) ? null : parsed
}

function getPageCountFromInstances(instances: Instance[]): number | null {
  if (instances.length === 0) return null

  for (const instance of instances) {
    if (instance.pages) {
      const pageCount = parsePageCount(instance.pages)
      if (pageCount) return pageCount
      else if (!instance.pages.includes("vol")) {
        console.log(
          `${instance.id} had an invalid page count ${instance.pages}`
        )
      }
    }
  }

  return null
}

function authorHasValidLifeSpan(lifeSpan: string): {
  valid: boolean
  alive?: boolean
} {
  const matches = lifeSpan.match(yearRegex)
  // There was only a single four digit year in the lifespan field
  // We assume this is the birth year (this is not always true)

  switch (matches?.length) {
    case 1:
      const birth = parseInt(matches[0], 10)
      // We add 100 years to the birth year
      // if that's greater than the current year
      // we count that as them still being alive, since we have no more info
      return { valid: true, alive: birth + 100 > currentYear }
    case 2:
      // The author has died
      return { valid: true, alive: false }

    default:
      return { valid: false }
  }
}

const NO_BOOK_COVER_URL = "nophoto/book/111x148"
function getImageId(url?: string): string | null {
  if (!url || url.includes(NO_BOOK_COVER_URL)) return null
  return url.split("/").slice(-2).join("/").split(".")[0] || null
}

// MAIN SCRIPT

const DATABASE_FILE = path.resolve(import.meta.dirname, "../books.db")
const JSON_FOLDER = path.resolve(import.meta.dirname, "cache/json")

const files = readdirSync(JSON_FOLDER, { recursive: true })
if (files.length === 0) {
  console.error(
    `Failed to find any json files in ${JSON_FOLDER}. Have you run "npm run fetch"?`
  )
  exit(1)
}

// Remove database file if it exists
if (existsSync(DATABASE_FILE)) unlinkSync(DATABASE_FILE)

const db = new DatabaseSync(DATABASE_FILE)
setupDatabaseTables(db)

const insertAuthor = db.prepare(
  "INSERT OR IGNORE INTO authors (libris_id, given_name, family_name, life_span, slug) VALUES (?, ?, ?, ?, ?)"
)
const getAuthorId = db.prepare("SELECT id FROM authors WHERE libris_id = ?")

const insertBook = db.prepare(`
  INSERT INTO books(title, author_id, year, isbn, pages, slug)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(author_id, slug)
  DO UPDATE SET id=id, instances=instances+1, year=MIN(excluded.year, books.year)
  RETURNING id
`)

const insertGoodreadsData = db.prepare(
  "INSERT OR IGNORE INTO goodreads(book_id, avg_rating, ratings, book_url) VALUES (?, ?, ?, ?)"
)

const insertBookCoverImage = db.prepare(
  "INSERT OR IGNORE INTO book_covers (book_id, host, image_id) VALUES (?, ?, ?)"
)

// Since we filter out all children's books earlier,
// we might get books that are by children's authors but are not tagged as such
const ignoredAuthors = ["Astrid Lindgren", "Gunilla Bergström", "Åke Holmberg"]

console.time("Import time")
db.prepare("BEGIN").run()
for (const file of files) {
  if (typeof file !== "string")
    throw new Error(`File was not expected type! File was ${typeof file}`)

  if (!file.endsWith(".json")) continue

  const yearString = file.split(".")[0]
  const year = Number.parseInt(yearString)
  if (Number.isNaN(year))
    throw new Error(`Failed to parse ${yearString} to a year!`)

  const fullPath = `${JSON_FOLDER}/${file}`
  const books = JSON.parse(readFileSync(fullPath, "utf-8")) as Release[]

  for (const book of books) {
    if (!book.author.lifeSpan) continue

    const { valid, alive } = authorHasValidLifeSpan(book.author.lifeSpan)
    if (!valid || alive) continue

    const combinedName = `${book.author.givenName} ${book.author.familyName}`

    if (ignoredAuthors.includes(combinedName)) continue

    const pageCount =
      getPageCountFromInstances(book.instances) ?? book.goodreads?.numPages

    if (!pageCount) {
      continue
    }

    // Ignore very short works
    if (pageCount < 50) continue

    // Find the first instance that has an ISBN, the first one in the list is the main instance
    // Only about 25% of the books have an ISBN
    const isbn = book.instances.find((x) => x.isbn)?.isbn ?? null

    const authorSlug = getSlug(combinedName)

    insertAuthor.run(
      book.author.id,
      book.author.givenName,
      book.author.familyName,
      book.author.lifeSpan ?? null,
      authorSlug
    )
    const authorId =
      getAuthorId.get(book.author.id)?.id ??
      throwError(`Failed to get author id for ${book.author}`)

    const bookSlug = getSlug(book.title)

    const bookId =
      insertBook.get(
        book.title,
        authorId,
        year,
        isbn,
        pageCount,
        // This is a combined slug to make it a stable id
        // since our ids are not stable, just incremented when we add the books
        // the id for one book might differ between generations of the database
        // by doing this we get a stable url that can be bookmarked without any issue
        `${bookSlug.slice(0, 150)}_${authorSlug.slice(0, 50)}`
      )?.id ?? throwError(`Failed to get book id for ${book.title}`)

    // We want to get the cover of the oldest release
    const oldestToNewest = book.images.toSorted((a, b) =>
      a.year.localeCompare(b.year)
    )
    for (const image of oldestToNewest) {
      const data = getBookCover(image, book)

      if (data) {
        insertBookCoverImage.run(bookId, data.host, data.id)
        // We only want one image per book
        break
      }
    }

    // Insert goodreads data if exists
    if (book.goodreads) {
      insertGoodreadsData.run(
        bookId,
        book.goodreads.avgRating,
        book.goodreads.ratingsCount,
        book.goodreads.bookUrl
      )

      const imageId = getImageId(book.goodreads.imageUrl)
      if (imageId) insertBookCoverImage.run(bookId, "goodreads", imageId)
    }
  }
}
db.prepare("COMMIT").run()
console.timeEnd("Import time")

// Remove the authors with the highest amount of ratings on Goodreads
// If the author doesn't even exist on Goodread, we count that as being lesser known
const deleted = db
  .prepare(
    `
WITH ranked AS (
  SELECT 
    author_id,
    pct
  FROM (
    SELECT
      author_id,
      PERCENT_RANK() OVER (ORDER BY SUM(ratings) ASC) AS pct
    FROM goodreads g
    INNER JOIN books b
      ON b.id = g.book_id 
    WHERE ratings > 0
    GROUP BY author_id
  ) WHERE pct >= 0.9
)
DELETE FROM authors
WHERE id IN (SELECT author_id FROM ranked)
  `
  )
  .run()

console.log(`Removed ${deleted.changes} authors`)

console.time("vaccum")
db.exec("VACUUM;")
console.timeEnd("vaccum")

db.close()
