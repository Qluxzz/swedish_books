import { sql } from "kysely"
import { queryBooks, db } from "./db.ts"
import { createPaginationResult, stringToIntWithError } from "./utils.ts"
import { PAGE_SIZE } from "./consts.ts"

export async function getPageRanges() {
  const groupBy = 100.0
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
    Math.ceil(count / PAGE_SIZE),
  ])
}

export async function getBooksForPageRange({
  range,
  page,
}: {
  range: string
  page: string
}) {
  const [min, max] = range.split("-").map(stringToIntWithError)
  const page_ = stringToIntWithError(page)

  return await createPaginationResult(
    queryBooks
      .where("books.pages", ">=", min)
      .where("books.pages", "<=", max)
      .orderBy((eb) => eb("book_covers.id", "is", null))
      .orderBy(
        (be) =>
          be(be.ref("goodreads.avg_rating"), "*", be.ref("goodreads.ratings")),
        "desc"
      )
      .orderBy(
        sql`((${sql.ref("books.id")} * 1103515245 + 12345 + 1337) & 0x7fffffff)`
      ),
    page_ - 1,
    PAGE_SIZE
  )
}
