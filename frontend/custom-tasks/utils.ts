import { SelectQueryBuilder, sql } from "kysely"

function throwError(message: string): never {
  throw Error(message)
}

async function createPaginationResult<DB, T extends keyof DB, O>(
  query: SelectQueryBuilder<DB, T, O>,
  page: number,
  pageSize: number,
  skip?: number
) {
  return await query
    .limit(Math.max(0, pageSize))
    .offset((skip ?? 0) + Math.max(0, page) * pageSize)
    .execute()
}

function stringToIntWithError(v: string): number {
  const parsed = Number.parseInt(v, 10)
  if (Number.isNaN(parsed)) throwError(`Failed to parse "${v}" to an int!`)
  return parsed
}

function randomFixedSeed(seed: number) {
  return sql`((((${sql.ref("books.id")} + ${seed}) * 1103515245) + (((${sql.ref(
    "books.id"
  )} + ${seed}) << 16) - (${sql.ref("books.id")} + ${seed}))) & 0x7fffffff)`
}

export {
  randomFixedSeed,
  throwError,
  createPaginationResult,
  stringToIntWithError,
}
