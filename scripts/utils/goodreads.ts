import { getFileOrDownload, log, NotSuccessfulRequestError } from "./helpers.ts"
import { Release } from "./release.ts"
import getSlug from "./slug.ts"

interface Goodreads {
  imageUrl: string
  bookId: string
  workId: string
  bookUrl: string
  from_search: boolean
  from_srp: boolean
  qid: string
  rank: number
  title: string
  bookTitleBare: string
  numPages: number
  avgRating: string
  ratingsCount: number
  author: {
    id: number
    name: string
    isGoodreadsAuthor: boolean
    profileUrl: string
    worksListUrl: string
  }
  description: {
    html: string
    truncated: boolean
    fullContentUrl: string
  }
}

async function getByISBN(isbn: string): Promise<Goodreads | null> {
  const fileName = `goodreads/${isbn}.json`
  const url = `https://www.goodreads.com/book/auto_complete?format=json&q=${isbn}`

  const data = await getFileOrDownload(fileName, url)

  return (JSON.parse(data) as Goodreads[]).at(0) ?? null
}

async function getByTitleAndAuthor(
  title: string,
  author: string
): Promise<Goodreads | null> {
  const slug = getSlug(`${title}-${author}`)

  const search = encodeURIComponent(`${title} ${author}`)

  // A file name can't be longer than 255 bytes generally
  const fileName = `goodreads/${slug.slice(0, 150)}.json`
  const url = `https://www.goodreads.com/book/auto_complete?format=json&q=${search}`

  const data = await getFileOrDownload(fileName, url)

  const searchResult = JSON.parse(data) as Goodreads[]
  if (searchResult.length === 0) return null

  const slugTitle = getSlug(title)
  const slugAuthor = getSlug(author)

  // Check that the search results include something with the same author or title
  return (
    searchResult.find(
      (x) =>
        getSlug(x.bookTitleBare) === slugTitle &&
        getSlug(x.author.name) === slugAuthor
    ) ?? null
  )
}

enum GoodreadsFetchError {
  RateLimited,
}

/**
 * Try to fetch data from Goodreads using ISBN and a combination of title and author
 * @param book
 * @returns goodreads data for book or null
 */
async function getDataFromGoodReads(
  book: Release
): Promise<Goodreads | null | GoodreadsFetchError> {
  try {
    for (const instance of book.instances) {
      if (!instance.isbn) continue

      const result = await getByISBN(instance.isbn)
      if (result) return result
    }

    return await getByTitleAndAuthor(book.title, book.author)
  } catch (error) {
    const err = error as Error

    if (err instanceof NotSuccessfulRequestError && err.status === 503)
      return GoodreadsFetchError.RateLimited

    log(
      `Unexpected error when fetching data for book ${book.title} ${book.author}. Error was: ${error}`
    )
    return null
  }
}

export { type Goodreads, getDataFromGoodReads, GoodreadsFetchError }
