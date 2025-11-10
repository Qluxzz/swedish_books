import { StatementSync } from "node:sqlite"

function throwError(message: string): never {
  throw Error(message)
}

function createPaginationResult(
  statement: StatementSync,
  page: number,
  pageSize: number
) {
  const data = statement.all({
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  })

  return {
    data: data.slice(0, pageSize),
    hasMore: data.length > pageSize,
  }
}

export { throwError, createPaginationResult }
