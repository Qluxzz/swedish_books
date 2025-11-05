import { sql } from "kysely"
import { bookBaseQuery, db } from "./db.ts"
import { stringToIntWithError } from "./utils.ts"

async function getAuthors() {
  return await db
    .selectFrom("authors")
    .select(["authors.id", "authors.slug"])
    .execute()
}

async function getTitlesForAuthor(authorId: string) {
  const authorId_ = stringToIntWithError(authorId)

  const titles = await bookBaseQuery
    .where("authors.id", "=", authorId_)
    .orderBy("books.year", "asc")
    .execute()

  if (titles.length === 0)
    throw new Error(
      "There should be no authors without titles in the database! This should be fixed in the import script"
    )

  return {
    author: {
      name: titles[0].author_name,
      life_span: titles[0].author_life_span,
    },
    titles: titles,
  }
}

async function getAuthorsCountByLetter() {
  return await db
    .selectFrom("authors")
    .select([
      sql`upper(substring(family_name, 1, 1))`.as("char"),
      sql`count(*)`.as("count"),
    ])
    .groupBy(sql`upper(substring(family_name, 1, 1))`)
    .execute()
}

async function getAuthorsByLetter(letter: string) {
  return await bookBaseQuery
    .where(sql`upper(substring(family_name, 1, 1))`, "=", letter)
    .execute()
}

export {
  getAuthors,
  getTitlesForAuthor,
  getAuthorsByLetter,
  getAuthorsCountByLetter,
}
