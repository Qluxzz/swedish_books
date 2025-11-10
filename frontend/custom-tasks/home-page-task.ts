import { PAGE_SIZE } from "./consts.ts"
import { db } from "./db.ts"
import { ratedTitlesQuery } from "./rated-titles-task.ts"
import { unratedTitlesQuery } from "./unrated-titles-task.ts"

// This is the first page for both rated and unrated titles
export async function getHomePageData(pageSize: number | null = PAGE_SIZE) {
  pageSize ??= PAGE_SIZE

  const titlesPerYear = db
    .prepare(
      `
SELECT
  b.year,
  COUNT(DISTINCT b.id) AS amount
FROM books b
GROUP BY
  b.year
ORDER BY
  b.year DESC;
`
    )
    .all()

  const ratedTitles = db
    .prepare(ratedTitlesQuery({ limit: true }))
    .all({ skip: 0, take: PAGE_SIZE })

  const unratedTitles = db
    .prepare(unratedTitlesQuery({ limit: true }))
    .all({ skip: 0, take: PAGE_SIZE })

  return {
    ratedTitles,
    unratedTitles,
    titlesPerYear: titlesPerYear,
  }
}
