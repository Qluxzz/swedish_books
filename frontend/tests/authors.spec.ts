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
        name: new RegExp(`[A-ZÅÄÖ] \\([1-9]\\d+?\\)`),
      })
      .all()

    expect(links.length).toBeGreaterThan(10)

    for (const link of links) {
      await expect(link).toBeVisible()
    }
  })
})
