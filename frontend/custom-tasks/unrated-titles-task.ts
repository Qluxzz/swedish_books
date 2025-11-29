import { PAGE_SIZE } from "./consts.ts"
import { bookBaseQuery } from "./db.ts"
import { createPaginationResult } from "./utils.ts"

async function getUnratedTitlesPageCount() {
  const result = await unratedTitlesQuery
    .select((f) => f.fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow()

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
const unratedTitlesQuery = bookBaseQuery.where((eb) =>
  eb.or([eb("goodreads.id", "is", null), eb("goodreads.ratings", "=", 0)])
)

export { getUnratedTitles, getUnratedTitlesPageCount, unratedTitlesQuery }
