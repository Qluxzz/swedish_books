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
        name: "Hitta svenska skönlitterära originalverk som du kanske inte känner till",
      })
      .waitFor({ state: "visible" })
  })

  test("Has expected sections", async ({ page }) => {
    await expect(
      page.locator("section:first-of-type", {
        has: page.getByRole("heading", { level: 2, name: "Betygsatta böcker" }),
      })
    ).toBeVisible()

    await expect(
      page.locator("section:nth-of-type(2)", {
        has: page.getByRole("heading", { level: 2, name: "Mysterierna" }),
      })
    ).toBeVisible()

    await expect(
      page.locator("section:last-of-type", {
        has: page.getByRole("heading", {
          level: 2,
          name: "Hitta titlar per år",
        }),
      })
    ).toBeVisible()
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
})
