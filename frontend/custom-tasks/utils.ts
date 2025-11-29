import { SelectQueryBuilder } from "kysely"

function throwError(message: string): never {
  throw Error(message)
}

async function createPaginationResult<DB, T extends keyof DB, O>(
  query: SelectQueryBuilder<DB, T, O>,
  page: number,
  pageSize: number
) {
  return await query
    .limit(Math.max(0, pageSize))
    .offset(Math.max(0, page) * pageSize)
    .execute()
}

function stringToIntWithError(v: string): number {
  const parsed = Number.parseInt(v, 10)
  if (Number.isNaN(parsed)) throwError(`Failed to parse "${v}" to an int!`)
  return parsed
}

export { throwError, createPaginationResult, stringToIntWithError }
