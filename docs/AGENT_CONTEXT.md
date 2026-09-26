# StockSense — shared build context for parallel agents

Project root: `/home/mittai/Documents/oodo`. Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, shadcn/ui (Base UI primitives, NOT Radix — components use a `render` prop instead of `asChild`), Supabase (cloud project, already linked via `npx supabase link`), Zod, React Hook Form, Recharts, TanStack Table, date-fns, Sonner.

Supabase project is LIVE at https://plftsigjexcmxikvfrzv.supabase.co, linked via CLI (`supabase/config.toml` project_id "stocksense"). Credentials are in `.env.local` (already present, dev server picks it up). DB password: see `.env.local` `SUPABASE_DB_PASSWORD`.

## IMPORTANT — read before writing code
- Next.js 16 breaking changes: `params`/`searchParams` in pages are **Promises**, must `await`. Route file is `proxy.ts` not `middleware.ts` (already created at repo root, do not duplicate). Use `PageProps<'/route'>` / helper types where natural, but plain `async function Page({ params, searchParams }: { params: Promise<{...}>; searchParams: Promise<{...}> })` is fine and safer.
- shadcn components live in `components/ui/*` — READ them before using (e.g. `dialog.tsx`, `alert-dialog.tsx`, `dropdown-menu.tsx`, `select.tsx` is Base UI's own Select which is heavier; prefer `components/ui/native-select.tsx` (`NativeSelect`, `NativeSelectOption`) for simple filter/form dropdowns — it's a plain `<select>` styled to match). Buttons: `variant` in `default|outline|secondary|ghost|destructive|link`, `size` in `default|sm|lg|xs|icon|icon-sm|icon-lg`.
- `cn()` from `@/lib/utils`.
- Toasts: `import { toast } from "sonner"`.
- Server actions return `ActionResult<T>` from `@/lib/action-result.ts`: `{ ok: true, data?, message? } | { ok: false, error, fieldErrors? }`. Never throw to the client for expected failures (validation, insufficient stock, duplicate SKU, RLS denial) — catch and return `{ ok:false, error: friendlyDbError(error, "context") }` using `@/lib/errors.ts`.
- Supabase clients: `@/lib/supabase/server` (`createClient()` async, RLS-scoped, use in Server Components & Server Actions), `@/lib/supabase/client` (`createClient()`, browser), `@/lib/supabase/admin` (`createAdminClient()`, service role, server-only, use ONLY for the login-id→email lookup in auth — do not use elsewhere).
- Formatting helpers in `@/lib/format.ts`: `formatCurrency`, `formatQty`, `formatDate`, `formatDateTime`, `businessToday()`, `sanitizeSearch()`.
- Shared UI in `components/shared/`: `PageHeader`, `StatusBadge`/`StockStatusBadge`/`ActiveBadge` (`components/shared/status-badge.tsx`), `EmptyState`, `ConfirmDialog`, `UrlSearchInput`, `UrlSelect`, `PaginationBar`/`parsePage`, `ViewToggle`/`useViewMode`, `TableSkeleton`. READ these files before using — they define the exact prop contracts.
- Brand: red primary (`--primary` in `app/globals.css`), logo `components/brand/logo.tsx` (`<Logo/>`, `<LogoMark/>`).
- All money in ₹ (INR) via `formatCurrency`. All quantities show unit of measure via `formatQty`.
- List pages (Receipts, Deliveries, Move History) default to **List view**, per wireframe. Use `useViewMode`/`ViewToggle` where a kanban/grid alternate view is offered.
- Filters/search live in the URL (`UrlSearchInput`, `UrlSelect`, plain `<Link>` for status chips) so pages are shareable/refreshable — read `searchParams` server-side to query Supabase directly (no client-side filtering of a full dataset).
- Every destructive/stock-changing button (cancel, complete/validate, deactivate, apply adjustment) must go through `ConfirmDialog`.
- Never hardcode KPI numbers — always query Supabase.

## Database schema (already migrated, do not redefine)
Full DDL: `supabase/migrations/20260926000100_core_schema.sql`. Read it. Key tables: `profiles(id,full_name,email,login_id,role[inventory_manager|warehouse_staff],avatar_url,phone)`, `product_categories`, `products(sku unique upper-case, category_id, unit_of_measure, per_unit_cost, initial_stock, reorder_point, reorder_quantity, active)`, `warehouses(short_code unique)`, `locations(warehouse_id, short_code unique per warehouse)`, `suppliers`, `customers`, `receipts`/`receipt_items`, `deliveries`/`delivery_items`, `internal_transfers`/`internal_transfer_items`, `stock_adjustments`/`stock_adjustment_items`. References are server-generated (`WH/IN/0001`, `WH/OUT/0001`, `TR/0001`, `ADJ/0001`) via triggers — never set `reference` from the client. Status enum `operation_status`: draft/waiting/ready/done/canceled (receipts & transfers only use draft/ready/done/canceled — no waiting; adjustments only draft/done/canceled).

Tables **not yet migrated** (you may need to add a migration file if your slice needs them — use a new timestamped file `supabase/migrations/2026092600NNNN_<name>.sql`, do NOT edit the existing one): `inventory_balances`, `stock_ledger`, `product_reorder_rules` is folded into `products` already (reorder_point/reorder_quantity columns — no separate table needed), `operation_activity_logs`, RPC functions (`receive_stock`/`complete_receipt`, `deliver_stock`/`complete_delivery`, `mark_delivery_waiting`/`mark_delivery_ready`, `transfer_stock`/`complete_transfer`, `adjust_stock`/`apply_adjustment`), RLS policies. **If you are the DB agent, own these. If you are a frontend agent and your page needs one of these and it doesn't exist yet, stub your query defensively (empty state) and note it — the DB agent is landing it in parallel.**

## Coordination / file ownership (avoid collisions)
Each agent should ONLY create/edit files inside its own route group / listed paths below. Shared files (`components/shared/*`, `lib/*`, `components/ui/*`, migration 20260926000100) are READ-ONLY for everyone except the DB agent (migrations) — if you need a new shared helper, add a NEW file, don't edit existing shared ones.

Run `npm run build` or at least let Next dev compile (check `/tmp/.../tasks/bluh124qn.output` style background dev log, or just trust TypeScript) before declaring done. Keep components server-first; add `"use client"` only where interactivity (forms, dialogs, dropdowns) is needed.
