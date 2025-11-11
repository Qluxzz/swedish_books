import { throwError } from "./utils.ts"
import { bookBaseQuery, db } from "./db.ts"

async function getAuthors() {
  return await db.selectFrom("authors").execute()
}

async function getTitlesForAuthor(authorId: string) {
  const authorId_ = Number.parseInt(authorId)

  const authorInfo =
    (await db
      .selectFrom("authors")
      .where("authors.id", "=", authorId_)
      .select(["authors.name", "authors.life_span"])
      .executeTakeFirstOrThrow()) ?? throwError("Should be at least one row!")

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
