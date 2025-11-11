import { SelectQueryBuilder } from "kysely"

function throwError(message: string): never {
  throw Error(message)
}

async function createPaginationResult<DB, T extends keyof DB, O>(
  statement: SelectQueryBuilder<DB, T, O>,
  page: number,
  pageSize: number
) {
  const data = await statement
    .limit(Math.max(0, pageSize + 1))
    .offset(Math.max(0, page) * pageSize)
    .execute()

  return {
    data: data.slice(0, pageSize),
    hasMore: data.length > pageSize,
  }
}

export { throwError, createPaginationResult }
