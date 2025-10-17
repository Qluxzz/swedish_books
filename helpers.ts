import { Response } from "node-fetch"

function* chunk<T>(arr: T[], n: number) {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n)
  }
}

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ensureSuccessStatusCode(resp: Response): void | never {
  if (resp.status < 200 || resp.status >= 300)
    throw new Error(
      `Request to ${resp.url} was not successful. Returned ${resp.status} ${resp.statusText}`
    )
}

export { chunk, timeout, ensureSuccessStatusCode }
