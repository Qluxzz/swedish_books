#!/usr/bin/env bash

# Removes all js stuff, since this is a pure non js site

# Find all .html files recursively
find dist/ -type f -name "*.html" | while read -r file; do
  echo "Processing: $file"

  # 1. Remove all <script>...</script> blocks
  # 2. Remove all <link rel="modulepreload" ...> tags
  sed -E \
    -e 's#<script[^<]*</script>##g' \
    -e 's#<link rel="modulepreload"[^>]*>##g' \
    "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
done

echo "All HTML files have been cleaned and updated."

# Remove all files required by javascript
# not required since the site operates without JavaScript
find . -type f -name "content.dat" -delete
find . -type f -name "*.js" -delete

rm dist/template.html
rm dist/elm.js.opt
rm dist/___vite-manifest___.json
rm dist/all-paths.json
rm dist/api-patterns.json
rm dist/route-patterns.json
rm -rf dist/elm-stuff

echo "All JS and content.dat files have been deleted"
