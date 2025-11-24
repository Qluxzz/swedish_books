import { test, expect } from "@playwright/test"

test.describe("About page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("That about page exists", async ({ page }) => {
    const link = page.getByRole("link", { name: "Om", exact: true })
    await expect(link).toBeVisible()

    await link.click()

    await expect(
      page.getByRole("heading", { level: 2, name: "Om", exact: true })
    ).toBeVisible()
  })
})
