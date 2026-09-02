/** Frontend-only display formatting — never used to compute or validate anything. */
export function formatMoney(amount: number | undefined, currency?: string): string {
  if (amount === undefined) return "—";
  if (currency && /^[A-Za-z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency.toUpperCase(),
        maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      }).format(amount);
    } catch {
      // fall through to the plain fallback below
    }
  }
  return `${currency ? currency + " " : ""}${amount.toLocaleString()}`;
}
