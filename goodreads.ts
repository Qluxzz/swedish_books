import { getFileOrDownload } from "./helpers.js"
import slugify from "slugify"

export interface Goodreads {
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
  const slug = slugify.default(`${title}-${author}`)

  const search = encodeURIComponent(`${title} ${author}`)

  // A file name can't be longer than 255 bytes generally
  const fileName = `goodreads/${slug.slice(0, 100)}.json`
  const url = `https://www.goodreads.com/book/auto_complete?format=json&q=${search}`

  const data = await getFileOrDownload(fileName, url)

  const searchResult = JSON.parse(data) as Goodreads[]
  if (searchResult.length === 0) return null

  // Check that the search results include something with the same author or title
  const matching = searchResult.find(
    (x) => x.author.name === author || x.title === title
  )

  return matching ?? null
}

const goodreads = {
  getByISBN,
  getByTitleAndAuthor,
}

export default goodreads
