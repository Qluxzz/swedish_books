import { throwError } from "./utils.ts"
import { db } from "./db.ts"

const authors = db.prepare("SELECT * FROM authors").all()

function getAuthors() {
  return authors
}

const getAuthorInfo = db.prepare(
  "SELECT name, life_span FROM authors WHERE id = ?"
)

const getAllTitlesForAuthor = db.prepare(
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

function getTitlesForAuthor(authorId: string) {
  const authorInfo =
    getAuthorInfo.get(authorId) ?? throwError("Should be at least one row!")

  const titles = getAllTitlesForAuthor.all(authorId)

  return {
    author: authorInfo,
    titles: titles,
  }
}

export { getAuthors, getTitlesForAuthor }
