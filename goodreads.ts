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

  const fileName = `goodreads/${slug}.json`
  const url = `https://www.goodreads.com/book/auto_complete?format=json&q=${title} ${author}`

  const data = await getFileOrDownload(fileName, url)

  return (JSON.parse(data) as Goodreads[]).at(0) ?? null
}

const goodreads = {
  getByISBN,
  getByTitleAndAuthor,
}

export default goodreads
