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

async function getCountOfAuthorsByStartingFamilyNameLetter() {
  return await db
    .selectFrom("authors")
    .select([
      sql`upper(substring(family_name, 1, 5))`.as("prefix"),
      sql`count(*)`.as("amount"),
    ])
    .groupBy(sql`upper(substring(family_name, 1, 5))`)
    .execute()
}

async function getAuthorsByLetter(letter: string) {
  const bb = bookBaseQuery.as("bb")

  const rankedBooks = db
    .selectFrom("books as b")
    .leftJoin("goodreads as gr", "gr.book_id", "b.id")
    .select([
      "b.id as book_id",
      "b.author_id",
      sql<number>`
      ROW_NUMBER() OVER (
        PARTITION BY b.author_id
        ORDER BY (MAX(1, gr.ratings * gr.avg_rating) * b.instances) DESC
      )
    `.as("book_rank"),
    ])
    .as("rb")

  return db
    .selectFrom(bb)
    .innerJoin(rankedBooks, (join) =>
      join
        .onRef("rb.author_id", "=", "bb.author_id")
        .onRef("rb.book_id", "=", "bb.id")
    )
    .where("rb.book_rank", "<=", 3)
    .where("bb.author_name", "like", `${letter}%`)
    .selectAll()
    .orderBy("bb.author_name")
    .orderBy("bb.year", "desc")
    .execute()
}

export {
  getAuthors,
  getTitlesForAuthor,
  getCountOfAuthorsByStartingFamilyNameLetter,
  getAuthorsByLetter,
}
