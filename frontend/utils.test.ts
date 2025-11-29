import { expect, test } from "vitest"
import { groupByName } from "./utils.ts"

test.each([
  [
    [
      { prefix: "Ande", amount: 10 },
      { prefix: "Andr", amount: 10 },
    ],
    50,
    [{ prefix: "A", amount: 20 }],
  ],
  [
    [
      { prefix: "Andr", amount: 1 },
      { prefix: "Alst", amount: 50 },
    ],
    50,
    [
      { prefix: "An", amount: 1 },
      { prefix: "Al", amount: 50 },
    ],
  ],
  // Test case for mergeBuckets
  // [
  //   [
  //     { prefix: "Abra", amount: 1 },
  //     { prefix: "Andr", amount: 1 },
  //     { prefix: "Alst", amount: 50 },
  //   ],
  //   50,
  //   [
  //     { prefix: "Ab-An", amount: 2 },
  //     { prefix: "Al", amount: 50 },
  //   ],
  // ],
  [
    [
      { prefix: "Ande", amount: 10 },
      { prefix: "Borg", amount: 10 },
    ],
    50,
    [
      { prefix: "A", amount: 10 },
      { prefix: "B", amount: 10 },
    ],
  ],
])("groupByName(%j, %j) returns %j", (input, bucketSize, expected) => {
  const result = groupByName(input, bucketSize)

  expect(result).toStrictEqual(expected)
})
