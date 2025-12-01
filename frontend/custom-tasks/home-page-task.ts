import { bookBaseQuery, db } from "./db.ts"
import { ratedTitlesQuery } from "./rated-titles-task.ts"
import { unratedTitlesQuery } from "./unrated-titles-task.ts"
import { randomFixedSeed } from "./utils.ts"

// This is the first page for both rated and unrated titles
export async function getHomePageData(pageSize: number) {
  const [titlesPerYear, ratedTitles, unratedTitles] = await Promise.all([
    db
      .selectFrom("books")
      .groupBy("books.year")
      .orderBy("books.year", "desc")
      .select([
        "books.year",
        (q) => q.fn.count("books.id").distinct().as("amount"),
      ])
      .execute(),
    ratedTitlesQuery.limit(pageSize).execute(),
    unratedTitlesQuery.limit(pageSize).execute(),
  ])

  const SEED = 14
  const BOOKS_PER_WEEK = 12
  // Get random titles with covers, they should not be any of the rated/unrated titles on the first page
  const randomTitles = await bookBaseQuery
    .where("books.id", "not in", [
      ...ratedTitles.map((x) => x.id),
      ...unratedTitles.map((x) => x.id),
    ])
    .where("book_covers.id", "is not", null)
    .clearOrderBy()
    .orderBy(randomFixedSeed(SEED))
    // We offset by the books shown each week so we always go down the same ordered list
    // so there is no risk of duplicates between weeks
    // The current amount of books with covers is 3125
    // So showing 12 different books each week will work for 59 years
    .offset(getWeekIndex(new Date()) * BOOKS_PER_WEEK)
    .limit(BOOKS_PER_WEEK)
    .execute()

  return {
    randomTitles,
    ratedTitles,
    unratedTitles,
    titlesPerYear,
  }
}

export function getWeekIndex(now: Date) {
  const epoch = new Date(Date.UTC(2025, 11, 1)) // fixed starting week
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  return Math.floor((now.valueOf() - epoch.valueOf()) / msPerWeek)
}
