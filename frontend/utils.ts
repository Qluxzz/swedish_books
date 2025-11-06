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
  const grouped = Object.groupBy(prefixAndAmount, (v) =>
    v.prefix.slice(0, prefixSize)
  )

  return Object.entries(grouped)
    .map(([prefix, items]) => {
      const count = items?.reduce((acc, x) => acc + x.amount, 0) ?? 0

      if (count > bucketSize) {
        return groupByPrefixSize(items, bucketSize, prefixSize + 1)
      }

      return {
        prefix,
        amount: items?.reduce((acc, x) => acc + x.amount, 0) ?? 0,
      }
    })
    .flat()
}
