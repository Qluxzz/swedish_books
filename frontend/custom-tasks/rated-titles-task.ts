import { PAGE_SIZE } from "./consts.ts"
import { bookBaseQuery } from "./db.ts"
import { createPaginationResult } from "./utils.ts"

async function getRatedTitles(page: number) {
  return createPaginationResult(ratedTitlesQuery, page - 1, PAGE_SIZE, 12)
}

async function getRatedTitlesPageCount() {
  const result = await ratedTitlesQuery
    .select((f) => f.fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow()

  return Math.ceil((result.count - 12) / PAGE_SIZE) - 1 // The first page is the home page but it only have 12 items
}

const ratedTitlesQuery = bookBaseQuery.where("goodreads.ratings", ">", 0)

export { getRatedTitles, getRatedTitlesPageCount, ratedTitlesQuery }
