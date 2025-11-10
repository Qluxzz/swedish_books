import { DatabaseSync } from "node:sqlite"

// Opens and reuses a single database connection for the entire application
export const db = new DatabaseSync("../books.db", {
  readOnly: true,
})
