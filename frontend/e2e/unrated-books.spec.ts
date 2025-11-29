import { test, expect } from "@playwright/test"

test.describe("Unrated books", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

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

    // Elm pages client side routing sometimes doesn't update correctly
    // so we do a hard reload to double check
    await page.reload()

    await expect(page.locator(".book-card").first()).toBeVisible()
  })
})
