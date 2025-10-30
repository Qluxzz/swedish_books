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
  isbn?: string
  genres: Set<string>
  /**
   * This is the unique instance ids per work
   * This can be used to fetch the image for the work, if we don't get it from Goodreads
   */
  instances: Set<string>
  goodreads?: Goodreads
}

export type { Release }
