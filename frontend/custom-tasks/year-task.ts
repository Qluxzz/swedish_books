import { db } from "./db.ts"
import { ratedTitlesQuery } from "./rated-titles-task.ts"
import { unratedTitlesQuery } from "./unrated-titles-task.ts"

function getTitlesForYear(year: string) {
  const ratedTitles = db
    .prepare(ratedTitlesQuery({ where: "b.year = ?" }))
    .all(year)

  const unratedTitles = db
    .prepare(unratedTitlesQuery({ where: "b.year = ?" }))
    .all(year)

  return { ratedTitles, unratedTitles }
}

function getAvailableYears() {
  return db
    .prepare("SELECT DISTINCT MIN(year) min, MAX(year) max FROM books")
    .get()
}

export { getTitlesForYear, getAvailableYears }
