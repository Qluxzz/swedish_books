#!/usr/bin/env bash

# Compare two book databases to find what has changed between running import.tsx

if [ -z "$1" ] || [ -z "$2" ]; then
    echo 'You need to give the path to two SQLite databases'
    exit 1
fi

sqlite3 :memory: "attach \"$1\" as old; attach \"$2\" as new; 
SELECT 'Books that does not exist in both database';
SELECT 'Old', 'New';
SELECT * FROM (
    SELECT 
        ob.title, 
        oa.name 
    FROM 
        old.books ob
    INNER JOIN
        old.authors oa ON oa.id = ob.author_id
) ob FULL OUTER JOIN (
    SELECT 
        nb.title, 
        na.name
    FROM
        new.books nb 
    INNER JOIN 
        new.authors na ON na.id = nb.author_id 
) nb ON
    nb.title = ob.title 
    AND nb.name = ob.name
WHERE nb.title is NULL OR ob.title IS NULL;

SELECT '';

SELECT 'Authors that does not exist in both database';
SELECT 'Old', 'New';
SELECT * FROM (
    SELECT
        a.name,
        a.life_span 
    FROM
        old.authors a
) oa FULL OUTER JOIN (
    SELECT 
        a.name,
        a.life_span 
    FROM 
        new.authors a 
) na ON
    na.name = oa.name 
    AND na.life_span = oa.life_span
WHERE na.name is NULL OR oa.name IS NULL
ORDER by oa.name ASC, na.name ASC;

SELECT '';
SELECT 'Book covers';
SELECT 'Old', 'New';
SELECT (SELECT COUNT(*) FROM old.book_covers), (SELECT COUNT(*) FROM new.book_covers);
"