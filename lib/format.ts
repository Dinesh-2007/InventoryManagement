import { format, parseISO } from "date-fns";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const qty = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

export const formatCurrency = (v: number | string | null | undefined) => inr.format(Number(v ?? 0));
export const formatQty = (v: number | string | null | undefined, uom?: string | null) =>
  `${qty.format(Number(v ?? 0))}${uom ? ` ${uom}` : ""}`;
export const formatDate = (v: string | Date | null | undefined) =>
  v ? format(typeof v === "string" ? parseISO(v) : v, "dd MMM yyyy") : "—";
export const formatDateTime = (v: string | Date | null | undefined) =>
  v ? format(typeof v === "string" ? parseISO(v) : v, "dd MMM yyyy, HH:mm") : "—";

/** "Today" in the business timezone (APP_TIMEZONE, default Asia/Kolkata) as yyyy-MM-dd. */
export function businessToday(tz = process.env.APP_TIMEZONE || "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Strip characters that have meaning in PostgREST filter strings before using in .or()/ilike. */
export function sanitizeSearch(q: string | null | undefined) {
  return (q ?? "").replace(/[,()*%\\:"']/g, " ").trim().slice(0, 80);
}
