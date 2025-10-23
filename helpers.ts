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
    console.info(`Using cached file ${fileName}`)
    return disk.toString()
  } catch {
    console.info(`Cached file ${fileName} not found, downloading!`)
  }

  console.time(url)
  const resp = await fetch(url)
  console.timeEnd(url)

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
      if (currentAttempt === attempts) throw error

      await waitMs(timeoutMs * currentAttempt)
    }
  } while (++currentAttempt <= attempts)

  throw new Error("Unexpected, should have thrown error on last attempt")
}

export { chunk, ensureSuccessStatusCode, getFileOrDownload, attemptWithTimeout }
