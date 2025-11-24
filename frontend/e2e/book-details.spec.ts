import { test, expect, Page } from "@playwright/test"

test.describe("Book details", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("Clicking author name goes to page about author, and we expect book we came from to be visible on the page", async ({
    page,
  }) => {
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

  test("Book has expected url", async ({ page }) => {
    await page.goto("/bok/ingenjoer-andrees-luftfaerd_per-olof-sundman")

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
})

// HELPERS
function findBook(title: string, authorAndLifeSpan: string, page: Page) {
  return page.locator(".book-card", {
    hasText: `${title}${authorAndLifeSpan}`,
  })
}
