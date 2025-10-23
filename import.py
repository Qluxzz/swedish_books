import sqlite3
import os
import json


def main():
    conn = sqlite3.connect("books2.db")
    conn.execute(
        """
CREATE TABLE IF NOT EXISTS books (
    id INTEGER INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    year INTEGER NOT NULL,
    isbn TEXT,
    pages INTEGER,
    avgRating INTEGER,
    ratings INTEGER,
    imageId TEXT,
    UNIQUE (title, author)
)
    """
    )

    for root, _, file in os.walk("json"):
        for f in file:
            year = f.split(".")[0]

            with open(f"{root}/{f}", "r") as file:
                data = json.load(file)
                for book in data:

                    goodreads = book.get("goodreads", {})

                    # If title with same author already exist, keep the oldest release
                    conn.execute(
                        """
INSERT INTO books(title, author, YEAR, isbn, pages, avgRating, ratings, imageId)
VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO
UPDATE
SET YEAR = excluded.year
WHERE excluded.year < books.year;
""",
                        (
                            book["title"],
                            book["author"],
                            year,
                            book.get("isbn", None),
                            goodreads.get("numPages", None),
                            goodreads.get("avgRating", None),
                            goodreads.get("ratingsCount", None),
                            get_image_id(book),
                        ),
                    )
                conn.commit()
    conn.close()


def get_image_id(book):
    if "goodreads" not in book:
        return None

    image_url = book["goodreads"]["imageUrl"]
    image_id = "/".join(image_url.split("/")[-2:]).split(".")[0]

    return image_id


if __name__ == "__main__":
    main()
