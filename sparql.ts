import { readFile } from "fs/promises"
import { getFileOrDownload } from "./helpers.ts"

const FORMAT = "application/sparql-results+json"

const BASE_URL =
  "https://libris.kb.se/sparql?format=FORMAT&should-sponge=soft&query=QUERY"
const QUERY = (await readFile("./query.rq")).toString()

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
    work: Value
    instance: Value
    title: Value
    givenName: Value
    familyName: Value
    isbn?: Value
    gf: Value
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
