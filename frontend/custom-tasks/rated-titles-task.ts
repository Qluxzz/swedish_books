import { PAGE_SIZE } from "./consts.ts"
import { bookBaseQuery } from "./db.ts"
import { createPaginationResult } from "./utils.ts"

async function getRatedTitles(page: number) {
  const pageSize = PAGE_SIZE

  return createPaginationResult(ratedTitlesQuery, page, pageSize)
}

async function getRatedTitlesPageCount() {
  const result = await ratedTitlesQuery
    .select((f) => f.fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow()

  return Math.ceil(result.count / PAGE_SIZE) - 2 // The first page is the home page
}

const ratedTitlesQuery = bookBaseQuery.where("goodreads.ratings", ">", 0)

export { getRatedTitles, getRatedTitlesPageCount, ratedTitlesQuery }
