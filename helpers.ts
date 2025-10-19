import fetch, { Response } from "node-fetch"
import fs from "node:fs/promises"

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
    console.info(`Using cached file ${fileName} for ${url}`)
    return disk.toString()
  } catch {
    console.info(`Cached file ${fileName} for ${url} not found, downloading!`)
    const resp = await fetch(url)

    ensureSuccessStatusCode(resp)

    const data = await resp.text()

    await fs.writeFile(fileName, data)

    return data
  }
}

export { chunk, timeout, ensureSuccessStatusCode, getFileOrDownload }
