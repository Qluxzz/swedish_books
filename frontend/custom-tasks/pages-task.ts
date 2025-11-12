import { sql } from "kysely"
import { queryBooks, db } from "./db.ts"
import { stringToIntWithError } from "./utils.ts"

export async function getPageRanges() {
  return (
    await db
      .selectFrom("books")
      .select([
        sql<number>`FLOOR(${sql.ref("books.pages")} / 50.0) * 50.0`.as("min"),
        sql<number>`CEIL(${sql.ref("books.pages")} / 50.0) * 50.0 - 1`.as(
          "max"
        ),
        sql<number>`COUNT(*)`.as("count"),
      ])
      .groupBy(sql`FLOOR(${sql.ref("books.pages")} / 50.0) * 50.0`)
      .distinct()
      .execute()
  ).map(({ min, max, count }) => [min, max, count])
}

export async function getBooksForPageRange(range: string) {
  const [min, max] = range.split("-").map(stringToIntWithError)

  return await queryBooks
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
    )
    .execute()
}
