import { Goodreads } from "./goodreads.ts"

interface Release {
  /**
   * The unique work id that all instances has as a parent
   */
  workId: string
  title: string
  authorId: string
  author: string
  lifeSpan?: string
  genres: Set<string>
  /**
   * These are all found instances of a work, this is usually re-pressings and new editions
   */
  instances: Instance[]
  images: Image[]
  goodreads?: Goodreads
}

interface Image {
  year: string
  host: string
  bib?: string
  isbn?: string
}

interface Instance {
  id: string
  bib?: string
  isbn?: string
  pages?: string
}

export type { Release, Instance, Image }
