import fetch, { Response } from "node-fetch"
import fs from "node:fs/promises"

function* chunk<T>(arr: T[], n: number) {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n)
  }
}

function waitMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Throws is status code is outside of 200 range
 * @param resp
 */
function ensureSuccessStatusCode(resp: Response): void | never {
  if (resp.status < 200 || resp.status >= 300)
    throw new Error(
      `Request to ${resp.url} was not successful. Returned ${resp.status} ${resp.statusText}`
    )
}

/**
 * If file exists, load and return data, otherwise download, write to file, and return data
 * @param fileName
 * @param url
 * @returns data
 */
async function getFileOrDownload(
  fileName: string,
  url: string
): Promise<string> {
  try {
    const disk = await fs.readFile(fileName)
    // console.info(`Using cached file ${fileName}`)
    return disk.toString()
  } catch {
    // console.info(`Cached file ${fileName} not found, downloading!`)
  }

  // console.time(url)
  const resp = await fetch(url)
  // console.timeEnd(url)

  ensureSuccessStatusCode(resp)

  const data = await resp.text()

  await fs.writeFile(fileName, data)

  return data
}

/**
 * Retry a promise that might fail
 * @param fn function that returns a promise, if you give a promise directly, since it will already have started, it might have failed outside the try/catch and will result in an unhandled exception
 * @param attempts number of attempts
 * @param timeoutMs the delay after a failure is attempts * timeout
 * @returns the data, or throws an error if we reached the number of attempts
 */
async function attemptWithTimeout<T>(
  fn: () => Promise<T>,
  attempts = 10,
  timeoutMs = 2000
): Promise<T> {
  let currentAttempt = 1
  do {
    try {
      return await fn()
    } catch (error) {
      if (currentAttempt === attempts)
        throw new Error(
          `Maximum number of attempts (${attempts}) was reached!`,
          {
            cause: error,
          }
        )

      await waitMs(timeoutMs * currentAttempt)
    }
  } while (++currentAttempt <= attempts)

  throw new Error("Unexpected, should have thrown error on last attempt")
}

/**
 * Allows you to throw errors in the end of an optional chain
 * @example obj?.that?.might?.be?.null ?? throwError("Did not expect chain to be null!")
 * @param message
 */
function throwError(message: string): never {
  throw Error(message)
}

/**
 * Log with time
 * @example [2011-11-11 11:11:11]: Message
 * @param message
 * @param optionalParams
 */
function log(message?: any, ...optionalParams: any[]) {
  console.log(
    `[${new Date().toLocaleString("sv")}]: ${message}`,
    ...optionalParams
  )
}

function isValidISBN(isbn: string): { result: boolean; normalized: string } {
  const clean = isbn.replace(/[^\dX]/g, "").toUpperCase()

  if (/^\d{9}[\dX]$/.test(clean)) {
    // ISBN-10 checksum
    const sum = clean
      .split("")
      .reduce(
        (acc, c, i) => acc + (c === "X" ? 10 : Number.parseInt(c)) * (10 - i),
        0
      )
    return { result: sum % 11 === 0, normalized: clean }
  }

  if (/^\d{13}$/.test(clean)) {
    // ISBN-13 checksum
    const sum = clean
      .split("")
      .reduce((acc, c, i) => acc + Number.parseInt(c) * (i % 2 ? 3 : 1), 0)
    return { result: sum % 10 === 0, normalized: clean }
  }

  return { result: false, normalized: clean }
}

export {
  chunk,
  ensureSuccessStatusCode,
  getFileOrDownload,
  attemptWithTimeout,
  throwError,
  log,
  isValidISBN,
}
