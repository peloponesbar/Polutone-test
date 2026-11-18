/** Russian plural form: pluralize(5, ['изделие', 'изделия', 'изделий']) → 'изделий'. */
export function pluralize(count: number, [one, few, many]: [string, string, string]): string {
  const n = Math.abs(count) % 100
  if (n >= 11 && n <= 14) return many
  const last = n % 10
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}
