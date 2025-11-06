import slugify from "slugify"

export default function getSlug(text: string) {
  return slugify.default(text, { lower: true, locale: "sv", strict: true })
}
