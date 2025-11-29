# Swedish books

A page where you can find lesser known original Swedish novels.

# Why?

I want to read more Swedish original works, and when I asked at my local library, they had no good way to find original works published in Swedish.

But I also want to highlight more today unknown/forgotten Swedish authors and works, since there are a lot of Swedish books that are currently stored in storage where the public is not allowed to browse, so the discoverability of those books are limited.

# Local development

Run `npm install`

Run `npm run fetch`
This will:

- For each year from 1850 to current year, call the SPARQL endpoint and fetch the data available
  - This data is cached in /cache/json-sparql
- For each unique title that is returned, try to fetch information from Goodreads using either ISBN or title + author name
  - This data is cached in /cache/goodreads

If anything fails during this, Goodreads start returning 503 because you're getting throttled, wait a bit then re-run the script, since successful response from both the SPARQL and Goodreads API is cached, you can resume the progress right where it stopped.

After this process is done, run `npm run import` which create SQLite database that is used by elm-pages.

Run `npm start` which starts the development server on [http://localhost:1234](http://localhost:1234)

# Testing

There is e2e testing using Playwright

# Information

This base book information is fetched from [Libris](https://libris.kb.se/), provided by [Kungliga biblioteket](https://www.kb.se/)

Libris provides a [SPARQL](https://en.wikipedia.org/wiki/SPARQL) [endpoint](https://libris.kb.se/sparql) which is used to fetch all original Swedish books that aren't translated.

The info is enhanced with data from [Goodreads](https://www.goodreads.com/), which is where the ratings info comes from.
