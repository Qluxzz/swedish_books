import { test, expect, Page } from "@playwright/test"

test.describe("application", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("Looks as expected", async ({ page }) => {
    test.setTimeout(60_000)
    await page.locator("footer").scrollIntoViewIfNeeded()
    await expect(page).toHaveScreenshot({
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      timeout: 30_000,
    })
  })

  test("Has expected header", async ({ page }) => {
    await page
      .getByRole("heading", {
        level: 2,
        name: "Mindre kända svenska originalverk",
      })
      .waitFor({ state: "visible" })
  })

  test("Has expected sections", async ({ page }) => {
    await expect(
      page.locator("section:first-child", {
        has: page.getByRole("heading", { level: 2, name: "Betygsatta böcker" }),
      })
    ).toBeVisible()

    await expect(
      page.locator("section:nth-child(2)", {
        has: page.getByRole("heading", { level: 2, name: "Mysterierna" }),
      })
    ).toBeVisible()

    await expect(
      page.locator("section:last-child", {
        has: page.getByRole("heading", {
          level: 2,
          name: "Hitta titlar per år",
        }),
      })
    ).toBeVisible()
  })

  test("Book has expected details", async ({ page }) => {
    const title = "Ingenjör Andrées luftfärd"
    const authorAndLifeSpan = "Per Olof Sundman (1922-1992)"
    const bookCard = findBook(title, authorAndLifeSpan, page)
    await expect(bookCard).toBeVisible()

    await expect(
      bookCard.getByRole("heading", {
        level: 3,
        name: "Ingenjör Andrées luftfärd",
      })
    ).toBeVisible()
    await expect(
      bookCard.getByRole("link", { name: "Per Olof Sundman (1922-1992)" })
    ).toBeVisible()
    await expect(bookCard.getByRole("link", { name: "1967" })).toBeVisible()
  })

  const expectedLinks = [
    "Goodreads",
    "StoryGraph",
    "Libris",
    "Bokbörsen",
    "Adlibris",
    "Bokus",
  ]
  test("Clicking on the book goes to book details with links to find book", async ({
    page,
  }) => {
    const bookCard = page.locator(".book-card").first()
    await expect(bookCard).toBeVisible()

    const detailsLink = bookCard.getByRole("img", { name: "Omslag för" })
    await expect(detailsLink).toBeVisible()
    await detailsLink.click()

    for (const link of expectedLinks) {
      await expect(
        page.getByRole("link", { name: link, exact: true })
      ).toBeVisible()
    }
  })

  test("Clicking on the book title to book details with links to find book", async ({
    page,
  }) => {
    const title = "Ingenjör Andrées luftfärd"
    const authorAndLifeSpan = "Per Olof Sundman (1922-1992)"
    const bookCard = findBook(title, authorAndLifeSpan, page)
    await expect(bookCard).toBeVisible()

    const detailsLink = bookCard.getByRole("link", { name: title, exact: true })
    await expect(detailsLink).toBeVisible()
    await detailsLink.click()

    for (const link of expectedLinks) {
      await expect(
        page.getByRole("link", { name: link, exact: true })
      ).toBeVisible()
    }
  })

  test("Clicking author name goes to page about author", async ({ page }) => {
    const title = "Ingenjör Andrées luftfärd"
    const authorAndLifeSpan = "Per Olof Sundman (1922-1992)"

    const bookCard = findBook(title, authorAndLifeSpan, page)
    await expect(bookCard).toBeVisible()

    const authorLink = bookCard.getByRole("link", {
      name: authorAndLifeSpan,
    })
    await authorLink.click()

    expect(page.url()).toMatch(/\/forfattare\/\d+\/per-olof-sundman/)
    await expect(
      page.getByRole("heading", { level: 2, name: authorAndLifeSpan })
    ).toBeVisible()

    const books = await page.locator(".book-card").all()
    // All titles should be written by the same author
    for (const book of books) {
      // There's no link to the author on the author page
      await expect(
        book.getByRole("link", { name: authorAndLifeSpan })
      ).toBeHidden()
      // But the author name is still written on each book card
      await expect(book.getByText(authorAndLifeSpan)).toBeVisible()
    }
  })

  test("Clicking publication year goes to page with titles for that year", async ({
    page,
  }) => {
    const title = "Ingenjör Andrées luftfärd"
    const authorAndLifeSpan = "Per Olof Sundman (1922-1992)"
    const year = "1967"

    let bookCard = findBook(title, authorAndLifeSpan, page)
    await expect(bookCard).toBeVisible()

    const yearLink = bookCard.getByRole("link", {
      name: year,
    })
    await expect(yearLink).toBeVisible()
    await yearLink.click()

    expect(page.url()).toContain(`/ar/${year}`)
    await expect(
      page.getByRole("heading", { level: 2, name: `Böcker för år ${year}` })
    ).toBeVisible()

    // This is the same book on the year page
    bookCard = findBook(title, authorAndLifeSpan, page)
    await expect(bookCard).toBeVisible()

    await expect(
      bookCard.getByRole("heading", {
        level: 3,
        name: "Ingenjör Andrées luftfärd",
      })
    ).toBeVisible()
    await expect(
      bookCard.getByRole("link", { name: "Per Olof Sundman (1922-1992)" })
    ).toBeVisible()
    // The year is not clickable when we're on a year page
    await expect(bookCard.getByRole("link", { name: year })).not.toBeVisible()
    // But the year is still shown on each book card
    await expect(bookCard.getByText(year)).toBeVisible()

    // Expect other books to have the same year
    const books = (await page.locator(".book-card").all()).slice(0, 5)
    for (const book of books) {
      await expect(book.getByText(year)).toBeVisible()
    }
  })

  test("There's a list of year links at the bottom of the home page", async ({
    page,
  }) => {
    const yearSection = page.locator("section:last-child", {
      has: page.getByText("Hitta titlar per år"),
    })
    await expect(yearSection).toBeVisible()
    const yearsToFind = [1995, 2012, 1972]

    for (const year of yearsToFind) {
      await expect(
        yearSection.getByRole("link", { name: year.toString() })
      ).toBeVisible()
    }
  })

  test("No book on home page is duplicated", async ({ page }) => {
    const books = await Promise.all(
      (await page.locator(".book-card").all()).map((x) => x.textContent())
    )
    expect(books).not.toContain(null)

    const uniqueBooks = new Set(books)

    expect(uniqueBooks.size).toBe(books.length)
  })

  test.describe("Rated books", () => {
    test("Navigating to rated tiles works", async ({ page }) => {
      await page
        .getByRole("link", { name: "Se alla betygsatta böcker" })
        .click()
      expect(page.url()).toContain("/betygsatt/1")
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Visar alla betygsatta böcker",
        })
      ).toBeVisible()
    })

    test("Books on home page are not duplicated on first page of rated books", async ({
      page,
    }) => {
      const section = page.locator("section", {
        has: page.getByRole("heading", {
          level: 2,
          name: "Betygsatta böcker",
        }),
      })
      const books = await Promise.all(
        (await section.locator(".book-card").all()).map((x) => x.textContent())
      )

      await section
        .getByRole("link", { name: "Se alla betygsatta böcker" })
        .click()

      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Visar alla betygsatta böcker",
        })
      ).toBeVisible()

      const booksFromPage2 = await Promise.all(
        (await page.locator(".book-card").all()).map((x) => x.textContent())
      )
      expect(books).not.toMatchObject(booksFromPage2)
    })

    test("Sorting is stable on a rated books page", async ({ page }) => {
      await page.goto("/betygsatt/1")
      const books = await Promise.all(
        (await page.locator(".book-card").all()).map((x) => x.textContent())
      )
      await page.reload()
      const books2 = await Promise.all(
        (await page.locator(".book-card").all()).map((x) => x.textContent())
      )

      expect(books).toMatchObject(books2)
    })

    test("Pagination on rated titles works", async ({ page }) => {
      await page.goto("/betygsatt/1")
      await page
        .locator(".page-selector")
        .getByRole("link", { name: "2", exact: true })
        .click()
      expect(page.url()).toContain("/betygsatt/2")
    })

    test("Last page of rated titles has titles", async ({ page }) => {
      await page.goto("/betygsatt/1")
      await page.locator(".page-selector").getByRole("link").last().click()

      expect(await page.locator(".book-card").count()).not.toBe(0)
    })
  })

  test.describe("Unrated books", () => {
    test("Navigating to unrated tiles works", async ({ page }) => {
      await page
        .getByRole("link", { name: "Se alla ej betygsatta böcker" })
        .click()
      expect(page.url()).toContain("/ej-betygsatt/1")
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Visar alla ej betygsatta böcker",
        })
      ).toBeVisible()
    })

    test("Books on home page are not duplicated on first page of unrated books", async ({
      page,
    }) => {
      const section = page.locator("section", {
        has: page.getByRole("heading", {
          level: 2,
          name: "Mysterierna",
        }),
      })
      const books = await Promise.all(
        (await section.locator(".book-card").all()).map((x) => x.textContent())
      )

      await section
        .getByRole("link", { name: "Se alla ej betygsatta böcker" })
        .click()

      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Visar alla ej betygsatta böcker",
        })
      ).toBeVisible()

      const booksFromPage2 = await Promise.all(
        (await page.locator(".book-card").all()).map((x) => x.textContent())
      )
      expect(books).not.toMatchObject(booksFromPage2)
    })

    test("Sorting is stable on a unrated books page", async ({ page }) => {
      await page.goto("/ej-betygsatt/1")
      const books = await Promise.all(
        (await page.locator(".book-card").all()).map((x) => x.textContent())
      )
      await page.reload()
      const books2 = await Promise.all(
        (await page.locator(".book-card").all()).map((x) => x.textContent())
      )

      expect(books).toMatchObject(books2)
    })

    test("Pagination on unrated titles works", async ({ page }) => {
      await page.goto("/ej-betygsatt/1")
      await page
        .locator(".page-selector")
        .getByRole("link", { name: "2", exact: true })
        .click()
      expect(page.url()).toContain("/ej-betygsatt/2")
    })

    test("Last page of unrated titles has titles", async ({ page }) => {
      await page.goto("/ej-betygsatt/1")
      await page.locator(".page-selector").getByRole("link").last().click()

      expect(await page.locator(".book-card").count()).not.toBe(0)
    })
  })
})

// HELPERS
function findBook(title: string, authorAndLifeSpan: string, page: Page) {
  return page.locator(".book-card", {
    hasText: `${title}${authorAndLifeSpan}`,
  })
}
