/**
 * After running fetch_original_swedish_books.ts, run this to convert that into an SQLite database
 */

import { readdirSync, readFileSync, existsSync, unlinkSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { Release } from "./utils/release.ts"
import { getIdentifier, throwError } from "./utils/helpers.ts"
import slugify from "slugify"

const DATABASE_FILE = "./books.db"
const JSON_FOLDER = "cache/json"

if (existsSync(DATABASE_FILE)) unlinkSync(DATABASE_FILE)

const db = new DatabaseSync(DATABASE_FILE)

db.exec(`
CREATE TABLE genres (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);
`)

db.exec(`
CREATE TABLE authors (
  id INTEGER PRIMARY KEY,
  libris_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  life_span TEXT
);
`)

db.exec(`
CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  isbn TEXT,
  instances INTEGER NOT NULL DEFAULT 1,
  UNIQUE (title, author_id)
);
`)

db.exec(`
CREATE TABLE book_covers (
  id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  host TEXT NOT NULL,
  image_id TEXT NOT NULL
);
`)

db.exec(`
CREATE TABLE goodreads (
  id INTEGER PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  pages INTEGER,
  avg_rating INTEGER NOT NULL,
  ratings INTEGER NOT NULL,
  image_id TEXT,
  book_url TEXT NOT NULL
);
`)

db.exec(`
CREATE TABLE book_genre (
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, genre_id)
);
`)

const insertAuthor = db.prepare(
  "INSERT OR IGNORE INTO authors (libris_id, name, life_span, slug) VALUES (?, ?, ?, ?)"
)
const getAuthorId = db.prepare("SELECT id FROM authors WHERE libris_id = ?")

const insertBook = db.prepare(`
  INSERT INTO books(title, author_id, year, isbn)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(title, author_id)
  DO UPDATE SET id=id, instances=instances+1, year=MIN(excluded.year, books.year)
  RETURNING id
`)

const insertGenre = db.prepare("INSERT OR IGNORE INTO genres(name) VALUES(?)")
const getGenreId = db.prepare("SELECT id FROM genres WHERE name = ?")
const insertBookGenre = db.prepare(
  "INSERT OR IGNORE INTO book_genre(book_id, genre_id) VALUES (?, ?)"
)

const insertGoodreadsData = db.prepare(
  "INSERT INTO goodreads(book_id, pages, avg_rating, ratings, image_id, book_url) VALUES (?, ?, ?, ?, ?, ?)"
)

const insertBookCoverImage = db.prepare(
  "INSERT INTO book_covers (book_id, host, image_id) VALUES (?, ?, ?)"
)

const currentYear = new Date().getFullYear()
const yearRegex = /\d{4}/g

function authorHasValidLifeSpan(lifeSpan: string): boolean {
  const matches = lifeSpan.match(yearRegex)
  // There was only a single four digit year in the lifespan field
  // We assume this is the birth year (this is not always true)
  if (matches?.length === 1) {
    const birth = parseInt(matches[0], 10)
    // We add 100 years to the birth year
    // if that's greater than the current year
    // we count that as them still being alive, since we have no more info
    return birth + 100 > currentYear
  }
  return false
}

const NO_BOOK_COVER_URL = "nophoto/book/111x148"
function getImageId(url?: string): string | null {
  if (!url || url.includes(NO_BOOK_COVER_URL)) return null
  return url.split("/").slice(-2).join("/").split(".")[0] || null
}

const files = readdirSync(JSON_FOLDER, { recursive: true })

console.time("Import time")
db.prepare("BEGIN").run()
for (const file of files) {
  if (!file.endsWith(".json")) continue
  const year = Number.parseInt(file.split(".")[0])
  const fullPath = `${JSON_FOLDER}/${file}`
  const books = JSON.parse(readFileSync(fullPath, "utf-8")) as Release[]

  for (const book of books) {
    if (!book.lifeSpan || !authorHasValidLifeSpan(book.lifeSpan)) continue

    insertAuthor.run(
      book.authorId,
      book.author,
      book.lifeSpan ?? null,
      slugify.default(book.author, { lower: true, locale: "sv" })
    )
    const { id: authorId } = getAuthorId.get(book.authorId) ?? { id: null }
    if (!authorId) throw new Error(`Missing authorId for ${book.author}`)

    const { id: bookId } = insertBook.get(book.title, authorId, year) ?? {
      id: null,
    }
    if (!bookId) throw new Error(`Missing bookId for ${book.title}`)

    for (const instance of book.instances) {
      const data = (() => {
        if (!instance.imageHost) return null

        const host =
          instance.imageHost.split("/").pop() ??
          throwError("Failed to get image host")

        switch (host) {
          case "tomasgift":
            if (!instance.bib)
              throw new Error(
                "Image requires a bib, but instance doesn't have any!"
              )
            return { host: host, id: getIdentifier(instance.bib) }
          case "author":
            return {
              host: host,
              id:
                instance.isbn ??
                getIdentifier(instance.id) ??
                throwError(
                  `Instance ${
                    instance.id
                  } did not have an ISBN, and we couldn't parse the id, for book ${JSON.stringify(
                    book
                  )}`
                ),
            }

          case "bokrondellen":
          case "librisse":
          case "digi":
            if (!instance.isbn)
              throw new Error(
                `Image host "${host}" requires ISBN, but instance doesn't have any! ${JSON.stringify(
                  book
                )}`
              )
            return { host: host, id: instance.isbn }

          case "nielsen":
            // Not sure about this, using isbn returns a different title when tested
            return null

          case "sesam":
            // Example id, no way to find it in the existing data
            // https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/sesam/isbn/9189144325/I_364572_20061019105257.jpg/orginal
            return null

          case "libris":
            // Example id, no way to find it in the existing data
            // https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/libris/libris-bib/7650115/91-7588-130-6B.jpg/orginal
            return null

          default:
            throw new Error(
              `Unknown image host: ${instance.imageHost}. ${JSON.stringify(
                book
              )}`
            )
        }
      })()

      if (data) insertBookCoverImage.run(bookId, data.host, data.id)
    }

    // Insert goodreads data if exists
    if (book.goodreads) {
      insertGoodreadsData.run(
        bookId,
        book.goodreads.numPages,
        book.goodreads.avgRating,
        book.goodreads.ratingsCount,
        getImageId(book.goodreads.imageUrl),
        book.goodreads.bookUrl
      )
    }

    for (const genre of book.genres) {
      insertGenre.run(genre)
      const { id: genreId } =
        getGenreId.get(genre) ?? throwError("Expected to get a genre id")
      insertBookGenre.run(bookId, genreId)
    }
  }
}
db.prepare("COMMIT").run()
console.timeEnd("Import time")

db.close()
