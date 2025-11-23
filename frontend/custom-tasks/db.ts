import { Kysely, sql, SqliteDialect } from "kysely"
import Database from "better-sqlite3"
import { DB } from "./db-types.ts"

// Opens and reuses a single database connection for the entire application
export const db = new Kysely<DB>({
  dialect: new SqliteDialect({
    database: new Database("../books.db"),
  }),
  log: ["error"], // Add "query" to log all queries
})

export const bookBaseQuery = db
  .selectFrom("books")
  .innerJoin("authors", "authors.id", "books.author_id")
  .leftJoin("goodreads", "goodreads.book_id", "books.id")
  .leftJoin("book_covers", "book_covers.book_id", "books.id")
  .select([
    "books.id",
    "books.title",
    "books.slug",
    "authors.id as author_id",
    "authors.name as author_name",
    "authors.life_span as author_life_span",
    "authors.slug as author_slug",
    "books.year",
    "books.isbn",
    "goodreads.avg_rating",
    "goodreads.ratings",
    "goodreads.book_url",
    "book_covers.host as image_host",
    "book_covers.image_id",
  ])
  .orderBy((eb) => eb("book_covers.id", "is", null))
  .orderBy(
    (be) =>
      be(be.ref("goodreads.avg_rating"), "*", be.ref("goodreads.ratings")),
    "desc"
  )
  .orderBy(
    sql`((${sql.ref("books.id")} * 1103515245 + 12345 + 1337) & 0x7fffffff)`
  )
