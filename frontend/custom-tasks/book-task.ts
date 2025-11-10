import { db } from "./db.ts"

const getBookByIdQuery = db.prepare(`
SELECT
  b.id,
  b.slug,
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
WHERE b.id = ?
`)

const allBookUrls = db
  .prepare(`SELECT id, slug FROM books`)
  .all()
  .map((x) => [x.id, x.slug])

function getBookById(id: string) {
  return getBookByIdQuery.get(Number.parseInt(id))
}

function getAllBookUrls() {
  return allBookUrls
}

export { getBookById, getAllBookUrls }
