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
  instances: Set<Instance>
  goodreads?: Goodreads
}

interface Instance {
  id: string
  bib?: string
  imageHost?: string
  isbn?: string
}

export type { Release, Instance }
