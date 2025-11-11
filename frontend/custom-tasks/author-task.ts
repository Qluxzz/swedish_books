import { bookBaseQuery, db } from "./db.ts"

async function getAuthors() {
  return await db
    .selectFrom("authors")
    .select(["authors.id", "authors.slug"])
    .execute()
}

async function getTitlesForAuthor(authorId: string) {
  const authorId_ = Number.parseInt(authorId, 10)

  const authorInfo = await db
    .selectFrom("authors")
    .where("authors.id", "=", authorId_)
    .select(["authors.name", "authors.life_span"])
    .executeTakeFirstOrThrow()

  const titles = await bookBaseQuery
    .where("authors.id", "=", authorId_)
    .orderBy("books.year", "asc")
    .execute()

  return {
    author: authorInfo,
    titles: titles,
  }
}

export { getAuthors, getTitlesForAuthor }
