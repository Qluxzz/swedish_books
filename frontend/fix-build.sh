#!/usr/bin/env bash

# elm-pages has a bug where serving the site under a sub path https://github.com/dillonkearns/elm-pages/issues/404 doesn't work
# Since this site doesn't require any JavaScript,
# we can fix this ourselves by removing all script tags
# and prefixing all relative URLs with our subpath in the generated HTML files

# Base path to add to relative URLs
BASE_PATH="/swedish_books"

# Find all .html files recursively
find dist/ -type f -name "*.html" | while read -r file; do
  echo "Processing: $file"

  # 1. Remove all <script>...</script> blocks
  # 2. Remove all <link rel="modulepreload" ...> tags
  # 3. Update all href="/ to href="/swedish_books/
  # 4. Update src="/ to src="/swedish_books/
  sed -E \
    -e 's#<script[^<]*</script>##g' \
    -e 's#<link rel="modulepreload"[^>]*>##g' \
    -e "s#href=\"/+#href=\"${BASE_PATH}/#g" \
    -e "s#src=\"/+#src=\"${BASE_PATH}/#g" \
    "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
done

echo "All HTML files have been cleaned and updated."
