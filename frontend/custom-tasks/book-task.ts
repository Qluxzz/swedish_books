import { bookBaseQuery, db } from "./db.ts"

async function getBookBySlug(slug: string) {
  const [book_slug, author_slug] = slug.split("_")

  return await bookBaseQuery
    .where("books.slug", "like", `${book_slug}%`)
    .where("authors.slug", "like", `${author_slug}%`)
    .executeTakeFirstOrThrow()
}

async function getAllBookUrls() {
  return (await db.selectFrom("books").select("slug").execute()).map(
    ({ slug }) => slug
  )
}

export { getBookBySlug, getAllBookUrls }
