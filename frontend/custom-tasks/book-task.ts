import { bookBaseQuery, db } from "./db.ts"
import { stringToIntWithError } from "./utils.ts"

async function getBookById(id: string) {
  const id_ = stringToIntWithError(id)

  return await bookBaseQuery
    .where("books.id", "=", id_)
    .executeTakeFirstOrThrow()
}

async function getAllBookUrls() {
  return (await db.selectFrom("books").select(["id", "slug"]).execute()).map(
    (x) => [x.id, x.slug]
  )
}

export { getBookById, getAllBookUrls }
