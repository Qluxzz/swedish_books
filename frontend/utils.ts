/**
 * Group the item in the biggest buckets possible without exceeding max item count
 * @param prefixAndAmount the n first letters and an amount of matching items for that prefix
 * @param bucketSize
 * @returns a list of items with a maximum of bucketSize items per prefix
 */
export function groupByName(
  prefixAndAmount: { prefix: string; amount: number }[],
  bucketSize: number
): { prefix: string; amount: number }[] {
  if (prefixAndAmount.length === 0) return []

  return groupByPrefixSize(prefixAndAmount, bucketSize, 1)
}

function groupByPrefixSize(
  prefixAndAmount: { prefix: string; amount: number }[],
  bucketSize: number,
  prefixSize: number
): { prefix: string; amount: number }[] {
  return Object.entries(
    Object.groupBy(prefixAndAmount, (v) => v.prefix.slice(0, prefixSize))
  )
    .map(([prefix, items]) => {
      if (!items) throw new Error()

      const count = items.reduce((acc, x) => acc + x.amount, 0) ?? 0

      if (count > bucketSize) {
        return groupByPrefixSize(items, bucketSize, prefixSize + 1)
      }

      return {
        prefix,
        amount: count,
      }
    })
    .flat()
}

/**
 * Merge smaller buckets to at most bucket size
 * @param buckets
 * @param bucketSize
 * @returns merged buckets with the combined prefix of from-to
 */
function mergeBuckets(
  buckets: { prefix: string; amount: number }[],
  bucketSize: number
): { prefix: string; amount: number }[] {
  if (buckets.length === 1) return buckets

  // There are now no groups which are larger than the bucket size
  // We can now combine the smaller buckets, up to the bucket size
  return buckets.slice(1).reduce<{
    current: { start: string; end?: string; amount: number }
    combined: { prefix: string; amount: number }[]
  }>(
    (acc, group, i, arr) => {
      // The first letter has changed, we don't want to combine further
      if (
        !acc.current.start.startsWith(group.prefix[0]) ||
        acc.current.amount + group.amount > bucketSize
      ) {
        acc.combined.push({
          prefix: `${acc.current.start}${
            acc.current.end ? `-${acc.current.end}` : ""
          }`,
          amount: acc.current.amount,
        })
        acc.current = { start: group.prefix, amount: group.amount }
      } else {
        acc.current.amount += group.amount
        acc.current.end = group.prefix
      }

      // Last iteration, add current
      if (i + 1 === arr.length) {
        acc.combined.push({
          prefix: `${acc.current.start}${
            acc.current.end ? `-${acc.current.end}` : ""
          }`,
          amount: acc.current.amount,
        })
      }

      return acc
    },
    {
      current: { start: buckets[0].prefix, amount: buckets[0].amount },
      combined: [],
    }
  ).combined
}
