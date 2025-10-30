/**
 * After running fetch_original_swedish_books.ts, run this to convert that into an SQLite database
 */

import { readdirSync, readFileSync, existsSync, unlinkSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { Release } from "./utils/release.ts"
import { throwError } from "./utils/helpers.ts"
import slugify from "slugify"

const DATABASE_FILE = "./books.db"
const JSON_FOLDER = "json"

if (existsSync(DATABASE_FILE)) unlinkSync(DATABASE_FILE)

const db = new DatabaseSync(DATABASE_FILE)

db.exec(`
CREATE TABLE genres (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE authors (
  id INTEGER PRIMARY KEY,
  libris_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  life_span TEXT
);

CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES authors(id),
  year INTEGER NOT NULL,
  isbn TEXT,
  pages INTEGER,
  avgRating INTEGER,
  ratings INTEGER,
  imageId TEXT,
  bookUrl TEXT,
  instances INTEGER NOT NULL DEFAULT 1,
  UNIQUE (title, author_id)
);

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
  INSERT INTO books(title, author_id, year, isbn, pages, avgRating, ratings, bookUrl, imageId)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(title, author_id)
  DO UPDATE SET id=id, instances=instances+1, year=MIN(excluded.year, books.year)
  RETURNING id
`)

const insertGenre = db.prepare("INSERT OR IGNORE INTO genres(name) VALUES(?)")
const getGenreId = db.prepare("SELECT id FROM genres WHERE name = ?")
const insertBookGenre = db.prepare(
  "INSERT OR IGNORE INTO book_genre(book_id, genre_id) VALUES (?, ?)"
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

    const { id: bookId } = insertBook.get(
      book.title,
      authorId,
      year,
      book.isbn ?? null,
      book.goodreads?.numPages ?? null,
      book.goodreads?.avgRating ?? null,
      book.goodreads?.ratingsCount ?? null,
      book.goodreads?.bookUrl ?? null,
      getImageId(book.goodreads?.imageUrl)
    ) ?? { id: null }
    if (!bookId) throw new Error(`Missing bookId for ${book.title}`)

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
