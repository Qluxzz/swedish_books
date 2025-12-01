import { test, expect } from "vitest"
import { getWeekIndex } from "./home-page-task.ts"

test("Week number hash doesn't repeat", () => {
  const tests = [...Array(5000)].map((_, x) => new Date(2011, 0, x * 7))

  const result = new Map<number, Date>()

  for (const test of tests) {
    const res = getWeekIndex(test)

    expect(
      result.keys(),
      `${result.get(res)} had same hash as ${test.toISOString()}`
    ).not.toContain(res)

    result.set(res, test)
  }
})
