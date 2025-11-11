import { sql } from "kysely"
import { PAGE_SIZE } from "./consts.ts"
import { bookBaseQuery } from "./db.ts"
import { createPaginationResult } from "./utils.ts"

async function getRatedTitles(page: number) {
  const pageSize = PAGE_SIZE

  return createPaginationResult(ratedTitlesQuery, page, pageSize)
}

async function getRatedTitlesPageCount() {
  const result = await ratedTitlesQuery
    .select((f) => f.fn.countAll().as("count"))
    .executeTakeFirstOrThrow()

  if (typeof result?.count !== "number")
    throw new Error("Count was not a number!")

  return Math.ceil(result.count / PAGE_SIZE) - 2 // The first page is the home page
}

// Sorted by titles with covers first
// Then sorted by rating
// and then randomly using a fixed seed,
// so it stays consistent between executions
const ratedTitlesQuery = bookBaseQuery
  .where("goodreads.ratings", ">", 0)
  .orderBy(sql`book_covers.id IS NULL`)
  .orderBy(sql`(goodreads.avg_rating * goodreads.ratings) DESC`)
  .orderBy(sql`((books.id * 1103515245 + 12345 + 1337) & 0x7fffffff)`)

export { getRatedTitles, getRatedTitlesPageCount, ratedTitlesQuery }
