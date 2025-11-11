import { db } from "./db.ts"
import { ratedTitlesQuery } from "./rated-titles-task.ts"
import { unratedTitlesQuery } from "./unrated-titles-task.ts"

async function getTitlesForYear(year: string) {
  const year_ = Number.parseInt(year)

  const ratedTitles = await ratedTitlesQuery
    .where("books.year", "=", year_)
    .execute()

  const unratedTitles = await unratedTitlesQuery
    .where("books.year", "=", year_)
    .execute()

  return { ratedTitles, unratedTitles }
}

async function getAvailableYears() {
  return await db
    .selectFrom("books")
    .select([
      (f) => f.fn.min("books.year").distinct().as("min"),
      (f) => f.fn.max("books.year").distinct().as("max"),
    ])
    .executeTakeFirstOrThrow()
}

export { getTitlesForYear, getAvailableYears }
