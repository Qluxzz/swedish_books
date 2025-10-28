import sqlite3
import os
from pathlib import Path
import json


def main():
    if Path("./books2.db").is_file():
        os.remove("./books2.db")

    conn = sqlite3.connect("books2.db")
    conn.execute(
        """
CREATE TABLE IF NOT EXISTS genres (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
)
"""
    )
    conn.execute(
        """
CREATE TABLE IF NOT EXISTS book_genre(
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY(book_id, genre_id)
)
        """
    )
    conn.execute(
        """
CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    lifeSpan TEXT,
    year INTEGER NOT NULL,
    isbn TEXT,
    pages INTEGER,
    avgRating INTEGER,
    ratings INTEGER,
    imageId TEXT,
    bookUrl TEXT,
    instances INTEGER NOT NULL DEFAULT 1,
    UNIQUE (title, author)
)
    """
    )

    currentYear = datetime.now().year

    lifeSpanRegex = re.compile("(\\d{4})")

    for root, _, file in os.walk("json"):
        for f in file:
            year = f.split(".")[0]

            with open(f"{root}/{f}", "r") as file:
                data = json.load(file)
                for book in data:
                    lifeSpan: str | None = book.get("lifeSpan", None)

                    # Ignore works that are of living authors
                    if lifeSpan is not None:
                        matches = lifeSpanRegex.findall(lifeSpan)

                        if len(matches) == 1 and int(matches[0]) + 100 > currentYear:
                            continue

                    goodreads = book.get("goodreads", {})

                    # If title with same author already exist, keep the oldest release
                    # If title with same author already exist,
                    # increase the number of instances for the work,
                    # this will be used to filter out popular authors,
                    # since if they have been republished many times,
                    # they are probably more popular
                    (book_id,) = conn.execute(
                        """
                            INSERT INTO books(title, author, lifeSpan, year, isbn, pages, avgRating, ratings, bookUrl, imageId)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO
                            UPDATE
                            SET id=id, instances=instances+1, year=MIN(excluded.year, books.year)
                            RETURNING id
                        """,
                        (
                            book["title"],
                            book["author"],
                            book.get("lifeSpan", None),
                            year,
                            book.get("isbn", None),
                            goodreads.get("numPages", None),
                            goodreads.get("avgRating", None),
                            goodreads.get("ratingsCount", None),
                            goodreads.get("bookUrl", None),
                            get_image_id(book),
                        ),
                    ).fetchone()

                    genre_ids: list[int] = []
                    for genre in book["genres"]:
                        (genre_id,) = conn.execute(
                            "INSERT INTO genres (name) VALUES(?) ON CONFLICT DO UPDATE set id=id RETURNING id",
                            (genre,),
                        ).fetchone()
                        if genre_id is not None:
                            genre_ids.append(genre_id)

                    for genre_id in genre_ids:
                        conn.execute(
                            "INSERT OR IGNORE INTO book_genre (book_id, genre_id) VALUES (?, ?)",
                            (
                                book_id,
                                genre_id,
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
