import { DatabaseSync } from "node:sqlite"

export async function getRatedTitles() {
  console.log("Get titles")
  const database = new DatabaseSync("../books6.db")

  const result = database
    .prepare(
      `
WITH ranked AS (
  SELECT
    *,
    PERCENT_RANK() OVER (ORDER BY ratings DESC) AS pct
  FROM books
  WHERE ratings > 10 AND year < 2000
)
SELECT
  title,
  author,
  lifeSpan,
  year,
  isbn,
  avgRating,
  ratings,
  bookUrl,
  imageId
FROM ranked
WHERE pct > 0.25 AND pct < 0.75 AND avgRating > 3
ORDER BY random()
LIMIT 24;
    `
    )
    .all()

  return result
}

export async function getUnratedTitles() {
  console.log("Get unrated titles")
  const database = new DatabaseSync("../books6.db")

  const result = database
    .prepare(
      `
SELECT
  title,
  author,
  lifeSpan,
  year
FROM books
WHERE ratings = 0
ORDER BY random()
LIMIT 24;
    `
    )
    .all()

  return result
}
