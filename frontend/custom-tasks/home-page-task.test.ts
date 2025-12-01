import { test, expect } from "vitest"
import { getWeekIndex } from "./home-page-task.ts"

test("Week number calculation", () => {
  // The fixed starting week is based on 2025-11-30

  // All days of the same week should have the same week index
  expect(getWeekIndex(new Date(Date.UTC(2025, 11, 1)))).toBe(0)
  expect(getWeekIndex(new Date(Date.UTC(2025, 11, 2)))).toBe(0)
  expect(getWeekIndex(new Date(Date.UTC(2025, 11, 3)))).toBe(0)
  expect(getWeekIndex(new Date(Date.UTC(2025, 11, 4)))).toBe(0)
  expect(getWeekIndex(new Date(Date.UTC(2025, 11, 5)))).toBe(0)

  for (let i = 0; i < 100; ++i) {
    // The Sunday before should always be the last week index
    expect(getWeekIndex(new Date(Date.UTC(2025, 11, i * 7)))).toBe(i - 1)
    // Monday should be the new week index
    expect(getWeekIndex(new Date(Date.UTC(2025, 11, 1 + i * 7)))).toBe(i)
    // Sunday of the same week should have the same index still
    expect(getWeekIndex(new Date(Date.UTC(2025, 11, 1 + i * 7 + 6)))).toBe(i)
  }
})
