import { sql } from "kysely"
import { PAGE_SIZE } from "./consts.ts"
import { bookBaseQuery, db } from "./db.ts"
import { createPaginationResult } from "./utils.ts"

async function getUnratedTitlesPageCount() {
  const result = await unratedTitlesQuery
    .select((f) => f.fn.countAll().as("count"))
    .executeTakeFirstOrThrow()

  if (typeof result?.count !== "number")
    throw new Error("Count was not a number!")

  return Math.ceil(result.count / PAGE_SIZE) - 2 // The first page is the home page
}

async function getUnratedTitles(page: number) {
  const pageSize = PAGE_SIZE

  return createPaginationResult(
    unratedTitlesQuery,
    page + 1, // The home page is the real first page
    pageSize
  )
}

// Sorted by the titles with covers first,
// and then randomly using a fixed seed,
// so it stays consistent between executions
const unratedTitlesQuery = bookBaseQuery
  .where((eb) =>
    eb.or([eb("goodreads.id", "is", null), eb("goodreads.ratings", "=", 0)])
  )
  .orderBy((eb) => eb("book_covers.id", "is", null))
  .orderBy(
    sql`((${sql.ref("books.id")} * 1103515245 + 12345 + 1337) & 0x7fffffff)`
  )

export { getUnratedTitles, getUnratedTitlesPageCount, unratedTitlesQuery }
