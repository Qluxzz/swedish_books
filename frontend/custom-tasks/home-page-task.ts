import { PAGE_SIZE } from "./consts.ts"
import { db } from "./db.ts"
import { ratedTitlesQuery } from "./rated-titles-task.ts"
import { unratedTitlesQuery } from "./unrated-titles-task.ts"

// This is the first page for both rated and unrated titles
export async function getHomePageData(pageSize: number | null = PAGE_SIZE) {
  pageSize ??= PAGE_SIZE

  const titlesPerYear = await db
    .selectFrom("books")
    .groupBy("books.year")
    .orderBy("books.year", "desc")
    .select([
      "books.year",
      (q) => q.fn.count("books.id").distinct().as("amount"),
    ])
    .execute()

  const ratedTitles = await ratedTitlesQuery.limit(pageSize).execute()

  const unratedTitles = await unratedTitlesQuery.limit(pageSize).execute()

  return {
    ratedTitles,
    unratedTitles,
    titlesPerYear: titlesPerYear,
  }
}
