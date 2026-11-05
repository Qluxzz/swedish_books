#!/usr/bin/env bash

# Removes all js stuff, since this is a pure non js site, and rewrites
# root-relative links to include the GitHub Pages project base path.
#
# GitHub Pages serves this repository at /swedish_books/, while elm-pages
# emits links relative to the domain root. elm-pages' --base option can't be
# used here because it breaks pre-rendering (elm-pages issue #404).

set -euo pipefail

BASE_PATH="${BASE_PATH:-/swedish_books}"
BASE_PATH="${BASE_PATH%/}"

# Find all .html files recursively
find dist/ -type f -name "*.html" | while read -r file; do
  echo "Processing: $file"

  # 1. Remove all <script>...</script> blocks
  # 2. Remove all <link rel="preload" as="script" ...> tags
  # 3. Remove all <link rel="modulepreload" ...> tags
  # 4. Prepend the base path to root-relative href and src attributes
  sed -E \
    -e 's#<script[^<]*</script>##g' \
    -e 's#<link rel="preload" as="script"[^>]*>##g' \
    -e 's#<link rel="modulepreload"[^>]*>##g' \
    -e "s#(href|src)=\"/+#\1=\"${BASE_PATH}/#g" \
    "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
done

echo "All HTML files have been cleaned and updated."

# Remove all files required by javascript
# not required since the site operates without JavaScript
find dist -type f -name "content.dat" -delete
find dist -type f -name "*.js" -delete

rm -f dist/template.html
rm -f dist/elm.js.opt
rm -f dist/___vite-manifest___.json
rm -f dist/all-paths.json
rm -f dist/api-patterns.json
rm -f dist/route-patterns.json
rm -rf dist/elm-stuff

echo "All JS and content.dat files have been deleted"
