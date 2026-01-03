#!/usr/bin/env bash

# Compares modified books.db to the one on the main branch

if [[ -z `git status books.db --porcelain` ]]; then
    # No changes
    echo "books.db is not modified, run 'npm run import' and try again"
    exit 1
fi

# Get the original books.db and write it to a tmp file
git show HEAD:books.db > /tmp/books.orig

sqlite3 :memory: "attach '/tmp/books.orig' as old; attach 'books.db' as new; 
SELECT 'Books that does not exist in both database';
SELECT 'Old', 'New';
SELECT (SELECT COUNT(*) FROM old.books), (SELECT COUNT(*) FROM new.books);

-- Prints the books that don't exist in both databases
-- SELECT * FROM (
--     SELECT 
--         ob.title, 
--         oa.name 
--     FROM 
--         old.books ob
--     INNER JOIN
--         old.authors oa ON oa.id = ob.author_id
-- ) ob FULL OUTER JOIN (
--     SELECT 
--         nb.title, 
--         na.name
--     FROM
--         new.books nb 
--     INNER JOIN 
--         new.authors na ON na.id = nb.author_id 
-- ) nb ON
--     nb.title = ob.title 
--     AND nb.name = ob.name
-- WHERE nb.title is NULL OR ob.title IS NULL;

SELECT '';

SELECT 'Authors that does not exist in both database';
SELECT 'Old', 'New';
SELECT (SELECT COUNT(*) FROM old.authors), (SELECT COUNT(*) FROM new.authors);


-- Prints the authors that don't exist in both databases
-- SELECT * FROM (
--     SELECT
--         a.name,
--         a.life_span 
--     FROM
--         old.authors a
-- ) oa FULL OUTER JOIN (
--     SELECT 
--         a.name,
--         a.life_span 
--     FROM 
--         new.authors a 
-- ) na ON
--     na.name = oa.name 
--     AND na.life_span = oa.life_span
-- WHERE na.name is NULL OR oa.name IS NULL
-- ORDER by oa.name ASC, na.name ASC;

SELECT '';
SELECT 'Book covers';
SELECT 'Old', 'New';
SELECT (SELECT COUNT(*) FROM old.book_covers), (SELECT COUNT(*) FROM new.book_covers);
"