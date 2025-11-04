import { test, expect, Page } from "@playwright/test"

test.describe("application", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("Has expected header", async ({ page }) => {
    await page
      .getByRole("heading", {
        level: 1,
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
    const title = "Dikter"
    const authorAndLifeSpan = "Gunnar Ekelöf (1907-1968)"
    const bookCard = findBook(title, authorAndLifeSpan, page)
    await expect(bookCard).toBeVisible()

    await expect(
      bookCard.getByRole("heading", { level: 3, name: "Dikter" })
    ).toBeVisible()
    await expect(
      bookCard.getByRole("link", { name: "Gunnar Ekelöf (1907-1968)" })
    ).toBeVisible()
    await expect(bookCard.getByRole("link", { name: "1949" })).toBeVisible()
  })

  const expectedLinks = [
    "Goodreads",
    "Libris",
    "Bokbörsen",
    "Adlibris",
    "Bokus",
  ]
  test("Clicking 'Hitta boken!' shows links to find book", async ({ page }) => {
    const bookCard = page.locator(".book-card").first()
    await expect(bookCard).toBeVisible()

    for (const link of expectedLinks) {
      await expect(
        bookCard.getByRole("link", { name: link, exact: true })
      ).toBeHidden()
    }

    const showLinkButton = bookCard.getByText("Hitta boken!")
    await expect(showLinkButton).toBeVisible()
    await showLinkButton.click()

    for (const link of expectedLinks) {
      await expect(
        bookCard.getByRole("link", { name: link, exact: true })
      ).toBeVisible()
    }
  })

  test("Clicking author name goes to page about author", async ({ page }) => {
    const title = "Dikter"
    const authorAndLifeSpan = "Gunnar Ekelöf (1907-1968)"

    const bookCard = findBook(title, authorAndLifeSpan, page)
    await expect(bookCard).toBeVisible()

    const authorLink = bookCard.getByRole("link", {
      name: authorAndLifeSpan,
    })
    await authorLink.click()

    expect(page.url()).toMatch(/\/forfattare\/\d+\/gunnar-ekeloef/)
    await expect(
      page.getByRole("heading", { level: 1, name: authorAndLifeSpan })
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
    const title = "Dikter"
    const authorAndLifeSpan = "Gunnar Ekelöf (1907-1968)"
    const year = "1949"

    let bookCard = findBook(title, authorAndLifeSpan, page)
    await expect(bookCard).toBeVisible()

    const yearLink = bookCard.getByRole("link", {
      name: year,
    })
    await expect(yearLink).toBeVisible()
    await yearLink.click()

    expect(page.url()).toContain(`/ar/${year}`)
    await expect(
      page.getByRole("heading", { level: 1, name: `Böcker för år ${year}` })
    ).toBeVisible()

    // This is the same book on the year page
    bookCard = findBook(title, authorAndLifeSpan, page)
    await expect(bookCard).toBeVisible()

    await expect(
      bookCard.getByRole("heading", { level: 3, name: "Dikter" })
    ).toBeVisible()
    await expect(
      bookCard.getByRole("link", { name: "Gunnar Ekelöf (1907-1968)" })
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
    const yearSection = page.locator(".section:last-child", {
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

  // HELPERS

  function findBook(title: string, authorAndLifeSpan: string, page: Page) {
    return page.locator(".book-card", {
      hasText: `${title}${authorAndLifeSpan}`,
    })
  }
})
