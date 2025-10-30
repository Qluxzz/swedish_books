import { DatabaseSync } from "node:sqlite"
import { throwError } from "../scripts/utils/helpers.ts"

/**
 * For ranked books (has data from Goodreads) we ignore the 2% most popular books
 */
const ranked = `
ranked AS (
  SELECT 
    id,
    pct
  FROM (
    SELECT
      id,
      PERCENT_RANK() OVER (ORDER BY ratings ASC) AS pct
    FROM books
    WHERE ratings > 0
  ) WHERE pct < 0.98
)
`

/**
 * The more instances of books an author has, we count as more popular.
 * so then we filter out the most popular authors
 */
const filterPopularAuthors = `
popularity AS (
  SELECT 
    author_id,
    pct
  FROM (
    SELECT
      author_id,
      PERCENT_RANK() OVER (ORDER BY SUM(instances) ASC) AS pct
    FROM books GROUP BY author_id
  ) WHERE pct < 0.955
)`

const database = new DatabaseSync("../books.db", {
  readOnly: true,
})

export async function getHomePageData() {
  const ratedTitles = database
    .prepare(
      `
WITH ${ranked}, ${filterPopularAuthors}
SELECT
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  b.isbn,
  b.avgRating,
  b.ratings,
  b.bookUrl,
  b.imageId
FROM books b
INNER JOIN popularity p
  ON p.author_id = b.author_id
INNER JOIN ranked r
  ON r.id = b.id
INNER JOIN authors a
  ON a.id = b.author_id
ORDER BY (ratings * avgRating) DESC
LIMIT 24;
    `
    )
    .all()

  const unratedTitles = database
    .prepare(
      `
WITH ${filterPopularAuthors}
SELECT
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  b.isbn
FROM books b
INNER JOIN popularity p
  ON p.author_id = b.author_id
INNER JOIN authors a
  ON a.id = b.author_id
WHERE b.ratings IS NULL
ORDER BY p.pct DESC, RANDOM()
LIMIT 24
    `
    )
    .all()

  return { ratedTitles, unratedTitles }
}

export async function getTitlesForYear(year: string) {
  const ratedTitles = database
    .prepare(
      `
WITH ${ranked}, ${filterPopularAuthors}
SELECT
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  b.isbn,
  b.avgRating,
  b.ratings,
  b.bookUrl,
  b.imageId
FROM books b
INNER JOIN ranked r
  ON b.id = r.id
INNER JOIN popularity p
  ON p.author_id = b.author_id
INNER JOIN authors a
  ON a.id = b.author_id
WHERE 
  b.year = ?
ORDER BY (b.ratings * b.avgRating) DESC
    `
    )
    .all(year)

  const unratedTitles = database
    .prepare(
      `
WITH ${filterPopularAuthors}
SELECT
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  b.isbn
FROM books b
INNER JOIN popularity p
  ON p.author_id = b.author_id
INNER JOIN authors a
  ON a.id = b.author_id
WHERE (b.ratings IS NULL OR b.ratings = 0) AND b.year = ?
ORDER BY p.pct DESC, RANDOM()
    `
    )
    .all(year)

  return { ratedTitles, unratedTitles }
}

export function getCountOfTitlesPerYear() {
  return database
    .prepare(
      `
WITH ${ranked}, ${filterPopularAuthors}
SELECT 
  year,
  SUM(count) amount
FROM (
SELECT
  b.year,
  COUNT(*) count
FROM books b
INNER JOIN ranked r
  ON b.id = r.id
INNER JOIN popularity p
  ON p.author_id = b.author_id
GROUP BY b.year
UNION ALL
SELECT
  b.year,
  COUNT(*) count
FROM books b
INNER JOIN popularity p
  ON p.author_id = b.author_id
WHERE b.ratings IS NULL OR b.ratings = 0
GROUP BY b.year
)
GROUP BY year
`
    )
    .all()
    .reduce((acc, row) => {
      acc[row.year] = row.amount
      return acc
    }, {})
}

export function getAuthorsWithMultipleTitles() {
  return database
    .prepare(
      "SELECT a.id, a.slug FROM books b INNER JOIN authors a ON a.id = b.author_id GROUP BY author_id HAVING COUNT(*) > 1"
    )
    .all()
}

export function getTitlesForAuthor(authorId: string) {
  const authorInfo =
    database
      .prepare("SELECT name, life_span FROM authors WHERE id = ?")
      .get(authorId) ?? throwError("Should be at least one row!")

  const titles = database
    .prepare(
      `
SELECT 
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  b.isbn,
  b.avgRating,
  b.ratings,
  b.bookUrl,
  b.imageId 
FROM books b 
INNER JOIN authors a 
  ON b.author_id = a.id 
WHERE author_id = ? 
ORDER BY IIF(b.ratings is not null, b.ratings * b.avgRating, b.year) DESC
`
    )
    .all(authorId)

  return {
    author: authorInfo,
    titles: titles,
  }
}
