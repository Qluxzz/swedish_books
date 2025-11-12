import { queryBooks, db } from "./db.ts"
import { stringToIntWithError } from "./utils.ts"

async function getAuthors() {
  return await db
    .selectFrom("authors")
    .select(["authors.id", "authors.slug"])
    .execute()
}

async function getTitlesForAuthor(authorId: string) {
  const authorId_ = stringToIntWithError(authorId)

  const titles = await queryBooks
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

export { getAuthors, getTitlesForAuthor }
