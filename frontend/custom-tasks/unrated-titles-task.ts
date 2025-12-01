import { PAGE_SIZE } from "./consts.ts"
import { bookBaseQuery } from "./db.ts"
import { createPaginationResult } from "./utils.ts"

async function getUnratedTitles(page: number) {
  return createPaginationResult(unratedTitlesQuery, page - 1, PAGE_SIZE, 12)
}

async function getUnratedTitlesPageCount() {
  const result = await unratedTitlesQuery
    .select((f) => f.fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow()

  return Math.ceil((result.count - 12) / PAGE_SIZE) - 1 // The first page is the home page, but it only has 12 items
}

const unratedTitlesQuery = bookBaseQuery.where((eb) =>
  eb.or([eb("goodreads.id", "is", null), eb("goodreads.ratings", "=", 0)])
)

export { getUnratedTitles, getUnratedTitlesPageCount, unratedTitlesQuery }
