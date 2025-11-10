import { PAGE_SIZE } from "./consts.ts"
import { db } from "./db.ts"
import { createPaginationResult } from "./utils.ts"

async function getRatedTitles(page: number) {
  const pageSize = PAGE_SIZE

  return createPaginationResult(
    db.prepare(ratedTitlesQuery({ limit: true })),
    page + 1, // The home page is the real first page
    pageSize
  )
}

async function getRatedTitlesPageCount() {
  const result = db
    .prepare(`SELECT COUNT(*) count FROM (${ratedTitlesQuery()})`)
    .get()

  if (typeof result?.count !== "number")
    throw new Error("Count was not a number!")

  return Math.ceil(result.count / PAGE_SIZE) - 2 // The first page is the home page
}

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

export { getRatedTitles, getRatedTitlesPageCount, ratedTitlesQuery }
