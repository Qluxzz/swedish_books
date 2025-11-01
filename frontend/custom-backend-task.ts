import { DatabaseSync } from "node:sqlite"

const database = new DatabaseSync("../books.db", {
  readOnly: true,
})

export async function getHomePageData() {
  const ratedTitles = database
    .prepare(
      `
WITH
ranked_books AS (
  SELECT
    b.id AS book_id,
    b.title,
    a.id AS author_id,
    a.name AS author_name,
    a.life_span AS author_life_span,
    a.slug AS author_slug,
    b.year,
    g.avg_rating,
    g.ratings,
    g.book_url,
    bc.host AS image_host,
    bc.image_id AS image_id,
    (g.ratings * g.avg_rating * power((2025.0-b.year)/(2025.0-1850.0), 0.7)) AS rating,
    ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY (g.ratings * g.avg_rating * power((2025.0-b.year)/(2025.0-1850.0), 0.7)) DESC) AS rn
  FROM books b
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
  avg_rating,
  ratings,
  book_url,
  image_host,
  image_id,
  rating
FROM ranked_books
WHERE rn = 1  -- keep only top book per author
ORDER BY rating DESC
LIMIT 24;
    `
    )
    .all()

  const unratedTitles = database
    .prepare(
      `
WITH ranked_books AS (
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
    ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY RANDOM() DESC) AS rn
  FROM books b
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
  image_id
FROM ranked_books
WHERE rn = 1  -- keep only top book per author
ORDER BY RANDOM()
LIMIT 24;
    `
    )
    .all()

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

  return { ratedTitles, unratedTitles, titlesPerYear }
}

const getRatedTitlesForYear = database.prepare(`
SELECT DISTINCT
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
  ON a.id = b.author_id
INNER JOIN goodreads g
  ON g.book_id = b.id
LEFT JOIN book_covers bc
  ON bc.book_id = b.id
WHERE 
  b.year = ?
ORDER BY bc.id IS NOT NULL DESC, (g.ratings * g.avg_rating) DESC
`)

const getUnratedTitlesForYear = database.prepare(
  `
SELECT DISTINCT
  b.title,
  a.id author_id,
  a.name author_name,
  a.life_span author_life_span,
  a.slug author_slug,
  b.year,
  bc.host image_host,
  bc.image_id image_id
FROM books b
INNER JOIN authors a
  ON a.id = b.author_id
LEFT JOIN goodreads g
  ON g.book_id = b.id
LEFT JOIN book_covers bc
  ON bc.book_id = b.id
WHERE g.id IS NULL AND b.year = ?
ORDER BY bc.id IS NOT NULL DESC, RANDOM()
    `
)

export function getTitlesForYear(year: string) {
  const ratedTitles = getRatedTitlesForYear.all(year)
  const unratedTitles = getUnratedTitlesForYear.all(year)

  return { ratedTitles, unratedTitles }
}

const authors = database.prepare("SELECT * FROM authors").all()

export function getAuthors() {
  return authors
}

const getAllTitlesForAuthor = database.prepare(
  `
SELECT DISTINCT
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
ORDER BY b.year DESC
`
)

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

function throwError(message: string): never {
  throw Error(message)
}
