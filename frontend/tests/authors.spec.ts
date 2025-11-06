import { test, expect } from "@playwright/test"

test.describe("Authors pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forfattare")
  })

  test("Has correct title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: "Författare" })
    ).toBeVisible()
  })

  test("Shows a list of family name letter and count for each letter from A-Ö. The count should never be zero", async ({
    page,
  }) => {
    const links = await page
      .getByRole("link", {
        name: new RegExp(`^[A-ZÅÄÖ]+ \\([1-9]\\d+?\\)$`),
      })
      .all()

    expect(links.length).toBeGreaterThan(20)

    for (const link of links) {
      await expect(link).toBeVisible()
    }
  })

  test("Clicking a prefix takes you to a list of authors and their top three books", async ({
    page,
  }) => {
    const link = await page.getByRole("link", {
      name: "HU",
    })

    await expect(link).toBeVisible()

    await link.click()

    await expect(
      page.getByRole("heading", { level: 1, name: "Författare på HU" })
    ).toBeVisible()

    await expect(
      page.getByRole("heading", {
        level: 3,
        name: "Bengt Hubendick (1916-2012)",
      })
    ).toBeVisible()
  })
})
