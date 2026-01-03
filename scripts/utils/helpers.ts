import fetch, { Response } from "node-fetch"
import fs from "node:fs/promises"

class NotSuccessfulRequestError extends Error {
  public status: number

  constructor(resp: Response) {
    super(
      `Request to ${resp.url} was not successful. Returned ${resp.status} ${resp.statusText}`
    )
    this.status = resp.status
  }
}

/**
 * Throws is status code is outside of 200 range
 * @param resp
 * @throws NotSuccessfulRequestError
 */
function ensureSuccessStatusCode(resp: Response): void | never {
  if (resp.status < 200 || resp.status >= 300)
    throw new NotSuccessfulRequestError(resp)
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
  fileName = `${import.meta.dirname}/../cache/${fileName}`

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

/**
 * Returns the unique id from an identifier URI
 * @param id an id that looks like this https://libris.kb.se/zcmbzbh3wgxvd2lq#it
 */
function getIdentifier(id: string): string | null {
  return id.split("/").pop()?.split("#").at(0) ?? null
}

export {
  ensureSuccessStatusCode,
  getFileOrDownload,
  throwError,
  log,
  isValidISBN,
  getIdentifier,
  NotSuccessfulRequestError,
}
