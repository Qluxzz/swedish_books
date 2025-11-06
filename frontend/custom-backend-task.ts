import { DatabaseSync, StatementSync } from "node:sqlite"
import { groupByName } from "./utils.ts"

const database = new DatabaseSync("../books.db", {
  readOnly: true,
})

const PAGE_SIZE = 24

// This is the first page for both rated and unrated titles
export async function getHomePageData(pageSize: number | null = PAGE_SIZE) {
  pageSize ??= PAGE_SIZE

  const titlesPerYear = database
    .prepare(
      `
SELECT
  b.year,
  COUNT(DISTINCT b.id) AS amount
FROM books b
GROUP BY
  b.year
ORDER BY
  b.year DESC;
`
    )
    .all()

  const ratedTitles = database
    .prepare(ratedTitlesQuery({ limit: true }))
    .all({ skip: 0, take: PAGE_SIZE })

  const unratedTitles = database
    .prepare(unratedTitlesQuery({ limit: true }))
    .all({ skip: 0, take: PAGE_SIZE })

  return {
    ratedTitles,
    unratedTitles,
    titlesPerYear: titlesPerYear,
  }
}

export async function getRatedTitles(page: number) {
  const pageSize = PAGE_SIZE

  return createPaginationResult(
    database.prepare(ratedTitlesQuery({ limit: true })),
    page + 1, // The home page is the real first page
    pageSize
  )
}

export async function getRatedTitlesPageCount() {
  const result = database
    .prepare(`SELECT COUNT(*) count FROM (${ratedTitlesQuery()})`)
    .get()

  if (typeof result?.count !== "number")
    throw new Error("Count was not a number!")

  return Math.ceil(result.count / PAGE_SIZE) - 2 // The first page is the home page
}

export async function getUnratedTitlesPageCount() {
  const result = database
    .prepare(`SELECT COUNT(*) count FROM (${unratedTitlesQuery()})`)
    .get()

  if (typeof result?.count !== "number")
    throw new Error("Count was not a number!")

  return Math.ceil(result.count / PAGE_SIZE) - 2 // The first page is the home page
}

export async function getUnratedTitles(page: number) {
  const pageSize = PAGE_SIZE

  return createPaginationResult(
    database.prepare(unratedTitlesQuery({ limit: true })),
    page + 1, // The home page is the real first page
    pageSize
  )
}

export function getTitlesForYear(year: string) {
  const ratedTitles = database
    .prepare(ratedTitlesQuery({ where: "b.year = ?" }))
    .all(year)

  const unratedTitles = database
    .prepare(unratedTitlesQuery({ where: "b.year = ?" }))
    .all(year)

  return { ratedTitles, unratedTitles }
}

const authors = database.prepare("SELECT * FROM authors").all()

export function getAuthors() {
  return authors
}

const getAuthorInfo = database.prepare(
  "SELECT name, life_span FROM authors WHERE id = ?"
)

export function getTitlesForAuthor(authorId: string) {
  const authorInfo =
    getAuthorInfo.get(authorId) ?? throwError("Should be at least one row!")

  const titles = getAllTitlesForAuthor.all(authorId)

  return {
    author: authorInfo,
    titles: titles,
  }
}

export function getAvailableYears() {
  return database
    .prepare("SELECT DISTINCT MIN(year) min, MAX(year) max FROM books")
    .get()
}

export function getCountOfAuthorsByStartingFamilyNameLetter() {
  return groupByName(getAuthorsCountByLetter.all(), 60)
}

interface IAuthorWithBooks {
  id: string
  name: string
  slug: string
  lifeSpan?: string
  books: any[]
  total_books: number
}

export function getAuthorsByLetter(familyNamePrefix: string) {
  const data = getAuthorsByLetterQuery.all(`${familyNamePrefix}%`)

  return data
    .reduce((acc, book) => {
      const existing = acc.get(book.author_id)
      if (existing) {
        existing.books.push(book)
      } else {
        acc.set(book.author_id, {
          id: book.author_id,
          name: book.author_name,
          slug: book.author_slug,
          lifeSpan: book.author_life_span,
          totalBooks: book.total_books,
          books: [book],
        })
      }

      return acc
    }, new Map<string, IAuthorWithBooks>())
    .values()
    .toArray()
}

function throwError(message: string): never {
  throw Error(message)
}

function createPaginationResult(
  statement: StatementSync,
  page: number,
  pageSize: number
) {
  const data = statement.all({
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  })

  return {
    data: data.slice(0, pageSize),
    hasMore: data.length > pageSize,
  }
}

// QUERIES

// Sorted by titles with covers first
// Then sorted by rating
// and then randomly using a fixed seed,
// so it stays consistent between executions
const ratedTitlesQuery = ({
  where,
  limit,
}: {
  where?: string
  limit?: boolean
} = {}) => `
SELECT
  b.id,
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  g.avg_rating,
  g.ratings,
  g.book_url,
  bc.host image_host,
  bc.image_id
FROM books b
  INNER JOIN goodreads g ON g.book_id = b.id
  INNER JOIN authors a ON a.id = b.author_id
  LEFT JOIN book_covers bc ON bc.book_id = b.id
WHERE g.ratings > 0 ${where ? `AND ${where}` : ""}
ORDER BY 
  image_host IS NULL, 
  (g.avg_rating * g.ratings) DESC, 
  ((b.id * 1103515245 + 12345 + 1337) & 0x7fffffff)
${limit ? `LIMIT @skip, @take` : ""}
`

// Sorted by the titles with covers first,
// and then randomly using a fixed seed,
// so it stays consistent between executions
const unratedTitlesQuery = ({
  where,
  limit,
}: {
  where?: string
  limit?: boolean
} = {}) => `
SELECT
  b.id,
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  b.instances,
  g.avg_rating,
  g.ratings,
  g.book_url,
  bc.host image_host,
  bc.image_id
FROM books b
  LEFT JOIN goodreads g ON g.book_id = b.id
  INNER JOIN authors a ON a.id = b.author_id
  LEFT JOIN book_covers bc ON bc.book_id = b.id
  WHERE (g.id is NULL OR g.ratings = 0) ${where ? `AND ${where}` : ""}
ORDER BY bc.host IS NULL, ((b.id * 1103515245 + 12345 + 1337) & 0x7fffffff)
${limit ? `LIMIT @skip, @take` : ""}
`

const getAllTitlesForAuthor = database.prepare(
  `
SELECT DISTINCT
  b.id,
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  g.avg_rating,
  g.ratings,
  g.book_url,
  bc.host image_host,
  bc.image_id image_id
FROM books b 
INNER JOIN authors a 
  ON b.author_id = a.id 
LEFT JOIN goodreads g
  ON g.book_id = b.id
LEFT JOIN book_covers bc
  ON bc.book_id = b.id
WHERE author_id = ? 
ORDER BY b.year ASC
`
)

const getAuthorsCountByLetter = database.prepare(
  `SELECT upper(substring(family_name, 1, 5)) prefix, COUNT(*) amount FROM authors GROUP BY upper(substring(family_name, 1, 5))`
)

const getAuthorsByLetterQuery = database.prepare(
  `WITH ranked_books AS (
  SELECT 
    b.id book_id,
    b.author_id,
    ROW_NUMBER() OVER (PARTITION BY b.author_id ORDER BY b.instances DESC) AS book_rank
  FROM books b
)
SELECT DISTINCT
  b.id,
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  g.avg_rating,
  g.ratings,
  g.book_url,
  bc.host image_host,
  bc.image_id image_id,
  (SELECT COUNT(*) FROM books WHERE author_id = a.id) AS total_books
FROM authors a
INNER JOIN books b
  ON b.author_id = a.id 
LEFT JOIN goodreads g
  ON g.book_id = b.id
LEFT JOIN book_covers bc
  ON bc.book_id = b.id
INNER JOIN ranked_books rb 
  ON rb.author_id = a.id
  AND rb.book_id = b.id
WHERE 
  rb.book_rank <= 3
  AND a.family_name LIKE ?
ORDER BY 
  a.family_name, 
  a.given_name, 
  b.instances DESC;
`
)
