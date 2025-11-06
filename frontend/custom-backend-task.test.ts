import { expect, test } from "vitest"

/**
 * Group the item in the biggest buckets possible without exceeding max item count
 * @param prefixAndAmount the n first letters and an amount of matching items for that prefix
 * @param bucketSize
 * @returns a list of items with a maximum of bucketSize items per prefix
 */
function groupByName(
  prefixAndAmount: { prefix: string; amount: number }[],
  bucketSize: number
): { prefix: string; amount: number }[] {
  if (prefixAndAmount.length === 0) return []

  const groupedByFirstLetter = Object.groupBy(
    prefixAndAmount,
    (v) => v.prefix[0]
  )

  return Object.entries(groupedByFirstLetter)
    .map(([prefix, items]) => {
      return {
        prefix,
        amount: items?.reduce((acc, x) => acc + x.amount, 0) ?? 0,
      }
    })
    .filter(Boolean)
}

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
      { prefix: "Ande", amount: 10 },
      { prefix: "Borg", amount: 10 },
    ],
    50,
    [
      { prefix: "A", amount: 10 },
      { prefix: "B", amount: 10 },
    ],
  ],
])("groupByName(%j) returns %j", (input, bucketSize, expected) => {
  const result = groupByName(input, bucketSize)

  expect(result).toStrictEqual(expected)
})
