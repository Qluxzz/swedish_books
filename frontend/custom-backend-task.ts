import { DatabaseSync } from "node:sqlite"

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

const filterPopularAuthors = `
popularity AS (
  SELECT 
    author,
    lifeSpan,
    pct
  FROM (
    SELECT
      author,
      lifeSpan,
      PERCENT_RANK() OVER (ORDER BY SUM(instances) ASC) AS pct
    FROM books GROUP BY author, lifeSpan
  ) WHERE pct < 0.955
)`

const database = new DatabaseSync("../books6.db", {
  readOnly: true,
})

export async function getRatedTitles() {
  console.log("Get titles")
  const database = new DatabaseSync("../books6.db")

  const result = database
    .prepare(
      `
WITH ${ranked}, ${filterPopularAuthors}
SELECT
  b.title,
  b.author,
  b.lifeSpan,
  b.year,
  b.isbn,
  b.avgRating,
  b.ratings,
  b.bookUrl,
  b.imageId
FROM books b
INNER JOIN popularity p
  ON p.author = b.author
  AND p.lifeSpan = b.lifeSpan
INNER JOIN ranked r
  ON r.id = b.id
  AND r.pct < 0.8
-- Needs more tweaking, I would like to highlight older titles, but not have a hard cutoff
WHERE b.year < 2010 AND b.avgRating > 3 AND b.ratings > 10
ORDER BY b.year DESC
LIMIT 24;
    `
    )
    .all()

  return result
}

export async function getUnratedTitles() {
  const result = database
    .prepare(
      `
WITH ${filterPopularAuthors}
SELECT
  b.title,
  b.author,
  b.lifeSpan,
  b.year
FROM books b
INNER JOIN popularity p
  ON p.author = b.author
  AND p.lifeSpan = b.lifeSpan
WHERE b.ratings IS NULL
ORDER BY p.pct DESC, RANDOM()
LIMIT 24
    `
    )
    .all()

  return result
}

export async function getTitlesForYear(year: string) {
  const ratedTitles = database
    .prepare(
      `
WITH ${ranked}, ${filterPopularAuthors}
SELECT
  b.title,
  b.author,
  b.lifeSpan,
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
  ON p.author = b.author
  AND p.lifeSpan = b.lifeSpan
WHERE 
  b.year = ?
ORDER BY b.avgRating DESC
LIMIT 24;
    `
    )
    .all(year)

  const unratedTitles = database
    .prepare(
      `
WITH ${filterPopularAuthors}
SELECT
  b.title,
  b.author,
  b.lifeSpan,
  b.year
FROM books b
INNER JOIN popularity p
  ON p.author = b.author
  AND p.lifeSpan = b.lifeSpan
WHERE (b.ratings IS NULL OR b.ratings = 0) AND b.year = ?
ORDER BY p.pct DESC, RANDOM()
LIMIT 48
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
  ON p.author = b.author
  AND p.lifeSpan = b.lifeSpan
GROUP BY b.year
UNION ALL
SELECT
  b.year,
  COUNT(*) count
FROM books b
INNER JOIN popularity p
  ON p.author = b.author
  AND p.lifeSpan = b.lifeSpan
WHERE b.ratings IS NULL
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
