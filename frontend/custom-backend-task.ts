import { DatabaseSync } from "node:sqlite"
import { throwError } from "../scripts/utils/helpers.ts"

const database = new DatabaseSync("../books.db", {
  readOnly: true,
})

/**
 * For ranked books (has data from Goodreads) we ignore the 2% most popular books
 */
const ranked = `
ranked AS (
  SELECT 
    book_id,
    pct
  FROM (
    SELECT
      book_id,
      PERCENT_RANK() OVER (ORDER BY ratings ASC) AS pct
    FROM goodreads
    WHERE ratings > 0
  ) WHERE pct < 0.9
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

export async function getHomePageData() {
  const ratedTitles = database
    .prepare(
      `
WITH ${ranked}, ${filterPopularAuthors},
ranked_books AS (
  SELECT
    b.id AS book_id,
    b.title,
    a.id AS author_id,
    a.name AS author_name,
    a.life_span AS author_life_span,
    a.slug AS author_slug,
    b.year,
    b.isbn,
    g.avg_rating,
    g.ratings,
    g.book_url,
    bc.host AS image_host,
    bc.image_id AS image_id,
    (g.ratings * g.avg_rating * power((2025.0-b.year)/(2025.0-1850.0), 0.7)) AS rating,
    ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY (g.ratings * g.avg_rating * power((2025.0-b.year)/(2025.0-1850.0), 0.7)) DESC) AS rn
  FROM books b
  INNER JOIN popularity p ON p.author_id = b.author_id
  INNER JOIN ranked r ON r.book_id = b.id
  INNER JOIN goodreads g ON g.book_id = b.id
  INNER JOIN authors a ON a.id = b.author_id
  INNER JOIN book_covers bc ON bc.book_id = b.id
)
SELECT
  title,
  author_id,
  author_name,
  author_life_span,
  author_slug,
  year,
  isbn,
  avg_rating,
  ratings,
  book_url,
  image_host,
  image_id,
  rating
FROM ranked_books
WHERE rn = 1  -- keep only top book per author
ORDER BY rating DESC
LIMIT 48;
    `
    )
    .all()

  const unratedTitles = database
    .prepare(
      `
WITH ${filterPopularAuthors},
ranked_books AS (
  SELECT
    b.id AS book_id,
    b.title,
    a.id AS author_id,
    a.name AS author_name,
    a.life_span AS author_life_span,
    a.slug AS author_slug,
    b.year,
    bc.host AS image_host,
    bc.image_id AS image_id,
    p.pct AS rating,
    ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY p.pct DESC) AS rn
  FROM books b
  INNER JOIN popularity p ON p.author_id = b.author_id
  LEFT JOIN goodreads g ON g.book_id = b.id
  INNER JOIN authors a ON a.id = b.author_id
  INNER JOIN book_covers bc ON bc.book_id = b.id
  WHERE g.id is NULL
)
SELECT
  title,
  author_id,
  author_name,
  author_life_span,
  author_slug,
  year,
  image_host,
  image_id,
  rating
FROM ranked_books
WHERE rn = 1  -- keep only top book per author
ORDER BY rating DESC
LIMIT 48;


SELECT DISTINCT
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  b.isbn,
  bc.host image_host,
  bc.image_id image_id
FROM books b
INNER JOIN popularity p
  ON p.author_id = b.author_id
INNER JOIN authors a
  ON a.id = b.author_id
LEFT JOIN goodreads g
  ON g.book_id = b.id
INNER JOIN book_covers bc
  ON bc.book_id = b.id
WHERE g.id IS NULL
ORDER BY p.pct DESC, RANDOM()
LIMIT 48
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
SELECT DISTINCT
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  b.isbn,
  g.avg_rating,
  g.ratings,
  g.book_url,
  bc.host image_host,
  bc.image_id image_id
FROM books b
INNER JOIN ranked r
  ON b.id = r.book_id
INNER JOIN popularity p
  ON p.author_id = b.author_id
INNER JOIN authors a
  ON a.id = b.author_id
INNER JOIN goodreads g
  ON g.book_id = b.id
LEFT JOIN book_covers bc
  ON bc.book_id = b.id
WHERE 
  b.year = ?
ORDER BY bc.id IS NOT NULL DESC, (g.ratings * g.avg_rating) DESC
    `
    )
    .all(year)

  const unratedTitles = database
    .prepare(
      `
WITH ${filterPopularAuthors}
SELECT DISTINCT
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  b.isbn,
  bc.host image_host,
  bc.image_id image_id
FROM books b
INNER JOIN popularity p
  ON p.author_id = b.author_id
INNER JOIN authors a
  ON a.id = b.author_id
LEFT JOIN goodreads g
  ON g.book_id = b.id
LEFT JOIN book_covers bc
  ON bc.book_id = b.id
WHERE (g.ratings IS NULL OR g.ratings = 0) AND b.year = ?
ORDER BY bc.id IS NOT NULL DESC, p.pct DESC, RANDOM()
    `
    )
    .all(year)

  return { ratedTitles, unratedTitles }
}

const countOfTitlesPerYear = database
  .prepare(
    `
WITH ${ranked}, ${filterPopularAuthors}
SELECT year, amount FROM (
  SELECT DISTINCT
    b.year,
    COUNT(*) amount
  FROM books b
  INNER JOIN ranked r
    ON b.id = r.book_id
  INNER JOIN popularity p
    ON p.author_id = b.author_id
  INNER JOIN authors a
    ON a.id = b.author_id
  INNER JOIN goodreads g
    ON g.book_id = b.id
  LEFT JOIN book_covers bc
    ON bc.book_id = b.id
  GROUP BY b.year

  UNION ALL

  SELECT DISTINCT
    b.year,
    COUNT(*) amount
  FROM books b
  INNER JOIN popularity p
    ON p.author_id = b.author_id
  INNER JOIN authors a
    ON a.id = b.author_id
  LEFT JOIN goodreads g
    ON g.book_id = b.id
  LEFT JOIN book_covers bc
    ON bc.book_id = b.id
  WHERE (g.ratings IS NULL OR g.ratings = 0)
  GROUP BY b.year
)
GROUP BY year
ORDER BY year DESC
`
  )
  .all()

export function getCountOfTitlesPerYear() {
  return countOfTitlesPerYear
}

const authors = database.prepare("SELECT * FROM authors").all()

export function getAuthors() {
  return authors
}

export function getTitlesForAuthor(authorId: string) {
  const authorInfo =
    database
      .prepare("SELECT name, life_span FROM authors WHERE id = ?")
      .get(authorId) ?? throwError("Should be at least one row!")

  const titles = database
    .prepare(
      `
SELECT DISTINCT
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  b.isbn,
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
ORDER BY IIF(g.ratings is not null, g.ratings * g.avg_rating, b.year) DESC
`
    )
    .all(authorId)

  return {
    author: authorInfo,
    titles: titles,
  }
}
