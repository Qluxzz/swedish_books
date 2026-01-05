import { sql } from "kysely"
import { bookBaseQuery, db } from "./db.ts"

const BOOKS_PER_CATEGORY = 6

export async function getAboutInfo() {
  const pageCountGroups = await getBooksPerPageCount()
  const averagePageCount = await db
    .selectFrom("books")
    .select((x) => x.fn.avg<number>("books.pages").as("averagePageCount"))
    .executeTakeFirstOrThrow()
    .then((x) => Math.round(x.averagePageCount))

  const mostAverageBooks = await bookBaseQuery
    .where("books.pages", "=", averagePageCount)
    .limit(BOOKS_PER_CATEGORY)
    .execute()

  const mostCommonPageCount = await db
    .selectFrom("books")
    .select(["books.pages", (x) => x.fn.countAll<number>().as("count")])
    .groupBy("books.pages")
    .orderBy("count", "desc")
    .limit(1)
    .executeTakeFirstOrThrow()

  const mostCommonPageCountBooks = await bookBaseQuery
    .where("books.pages", "=", mostCommonPageCount.pages)
    .limit(BOOKS_PER_CATEGORY)
    .execute()

  const medianPageCount = await db
    .selectFrom(
      db
        .selectFrom("books")
        .select("books.pages")
        .orderBy("books.pages")
        .limit(sql<number>`2 - (SELECT COUNT(*) FROM books) % 2`)
        .offset(sql<number>`(SELECT (COUNT(*) - 1) / 2 FROM books)`)
        .as("t")
    )
    .select(db.fn.avg<number>("pages").as("median"))
    .executeTakeFirstOrThrow()
    .then((x) => x.median)

  const medianPageCountBooks = await bookBaseQuery
    .where("books.pages", "=", medianPageCount)
    .limit(BOOKS_PER_CATEGORY)
    .execute()

  return {
    pageCountGroups,
    averagePageCount,
    mostAverageBooks,
    mostCommonPageCount,
    mostCommonPageCountBooks,
    medianPageCount,
    medianPageCountBooks,
  }
}

async function getBooksPerPageCount() {
  const groupBy = 100.0

  const totalAmountOfWorks = (
    await db
      .selectFrom("books")
      .select((fn) => fn.fn.countAll<number>().as("amount"))
      .executeTakeFirstOrThrow()
  ).amount

  return (
    await db
      .selectFrom("books")
      .select([
        sql<number>`FLOOR(${sql.ref(
          "books.pages"
        )} / ${groupBy}) * ${groupBy}`.as("min"),
        sql<number>`FLOOR(${sql.ref(
          "books.pages"
        )} / ${groupBy}) * ${groupBy} + ${groupBy - 1}`.as("max"),
        sql<number>`COUNT(*)`.as("count"),
      ])
      .groupBy(sql`FLOOR(${sql.ref("books.pages")} / ${groupBy}) * ${groupBy}`)
      .distinct()
      .execute()
  ).map(({ min, max, count }) => [
    min,
    max,
    count,
    (count / totalAmountOfWorks) * 100,
  ])
}
