import { readFile } from "fs/promises"
import { getFileOrDownload } from "./helpers.ts"

const FORMAT = "application/sparql-results+json"

const BASE_URL =
  "https://libris.kb.se/sparql?format=FORMAT&should-sponge=soft&query=QUERY"
const QUERY = (await readFile("../query.rq"))
  .toString()
  // Remove all comments from query
  .replaceAll(/^.*#.*$\n?/gm, "")

console.log(QUERY)

async function loadLibrisSPARQLSearchResults(
  year: number
): Promise<SparqlResponse> {
  const fileName = `json-sparql/${year}.json`
  const url = BASE_URL.replace("FORMAT", encodeURIComponent(FORMAT)).replace(
    "QUERY",
    encodeURIComponent(QUERY.replace("|YEAR|", year.toString()))
  )

  const data = await getFileOrDownload(fileName, url)

  return JSON.parse(data) as SparqlResponse
}

export interface SparqlResponse {
  head: Head
  results: Results
}

export interface Head {
  link: any[]
  vars: string[]
}

export interface Results {
  distinct: boolean
  ordered: boolean
  bindings: {
    instance: Value
    work: Value
    bib?: Value
    imageHost?: Value
    title: Value
    author: Value
    givenName: Value
    familyName: Value
    lifeSpan?: Value
    isni?: Value
    isbn?: Value
    genre: Value
  }[]
}

export interface Value {
  type: Type
  value: string
}

export enum Type {
  Bnode = "bnode",
  Literal = "literal",
  URI = "uri",
}

export { loadLibrisSPARQLSearchResults }
