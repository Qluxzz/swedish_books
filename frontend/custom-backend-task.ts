import { getAuthors, getTitlesForAuthor } from "./custom-tasks/author-task.ts"
import {
  getAvailableYears,
  getTitlesForYear,
} from "./custom-tasks/year-task.ts"
import {
  getRatedTitles,
  getRatedTitlesPageCount,
} from "./custom-tasks/rated-titles-task.ts"
import {
  getUnratedTitles,
  getUnratedTitlesPageCount,
} from "./custom-tasks/unrated-titles-task.ts"

import { getHomePageData } from "./custom-tasks/home-page-task.ts"

import { getAllBookUrls, getBookById } from "./custom-tasks/book-task.ts"

export { getAllBookUrls, getBookById }
export { getAuthors, getTitlesForAuthor }
export { getAvailableYears, getTitlesForYear }
export { getHomePageData }
export { getRatedTitles, getRatedTitlesPageCount }
export { getUnratedTitles, getUnratedTitlesPageCount }
