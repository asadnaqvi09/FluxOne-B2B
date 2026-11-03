# Client architecture (JS / JSX)

This app is **React + Vite**, written in **JavaScript / JSX only**. Do **not** introduce TypeScript (`.ts` / `.tsx`) unless the team explicitly decides later.

Use this doc when adding a screen, hook, or component so juniors and seniors follow the same map.

**PR checklist:** see repo root [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md).

---

## Stack (fixed)

| Layer | Choice |
|--------|--------|
| Language | **JS / JSX** |
| UI | React 19, Tailwind, `components/ui` primitives |
| Routing | `react-router-dom` — paths in `src/router/paths.js` |
| HTTP | Native `fetch` via `src/api/api.js` (`apiClient`) — **not** Axios |
| Global state | Redux Toolkit (`src/rtk/`) **only where already used / justified** |
| Local / screen data | Custom hooks in `src/hooks/{admin\|inventory\|branch\|shared}/` |
| Aliases | `@/` → `src/` |

---

## Folder map — where does a new file go?

```
src/
  api/           # HTTP client, endpoints, token storage — no React UI
  pages/         # Route screens only (thin). Grouped by role portal
  components/
    ui/          # Design primitives (button, input, dialog, table…)
    shared/      # Reused across 2+ features (PageHeader, ConfirmDialog…)
    feature/     # Domain UI (products, orders, control, admin, branch…)
  hooks/
    admin/       # Admin portal data hooks
    inventory/   # IM / products / control / orders hooks
    branch/      # Branch manager data hooks
    shared/      # Cross-portal utilities (debounce, auth session, notifications…)
  rtk/           # Shared global slices (auth, products, orders, control…)
  lib/           # Pure helpers (map, format, csv, validation) — no components
  layouts/       # Role shells + navbar
  router/        # Routes + auth/role gates
  context/       # Thin providers (Auth, Theme) over RTK / local state
  config/        # Static app config
  assets/        # Static media (logos, images)
```

### Pages by role (matches URL portals)

| Folder | Portal |
|--------|--------|
| `pages/admin/` | Super admin |
| `pages/inventory/` | Inventory manager |
| `pages/branch/` | Branch manager |
| `pages/auth/`, `pages/shared/`, `pages/splash/` | Cross-cutting |
| `pages/phase2/` | **Placeholders only** — see `pages/phase2/README.md` |

Pages **compose** feature components. They should not own large forms or tables inline when those already belong under `components/feature/…`.

### Components — three tiers

1. **`ui/`** — dumb primitives, no business rules, no API.
2. **`shared/`** — app-level reuse (dialogs, filters, page chrome). Put something here only if **two or more features** need it.
3. **`feature/{domain}/`** — domain-specific UI (tables, dialogs, panels). Prefer nesting for large domains (`feature/branch/staff/`, `feature/products/add-item/`).

### Hooks — domain folders (required)

| Folder | Put here |
|--------|----------|
| `hooks/admin/` | Branches, company, leaves, logs, settings, tax-profit, invoices, dashboard |
| `hooks/inventory/` | Products, control, orders, suppliers, dashboards, variant catalog |
| `hooks/branch/` | Staff, roster, sales, discounts, hardware, performance, activity logs |
| `hooks/shared/` | Auth session, currency, pagination, debounce, form helpers, notifications |

Import example: `import { useProducts } from '@/hooks/inventory/useProducts'`

### `lib/` layout (required)

```
lib/
  # Cross-cutting (stay at root)
  constants.js, utils.js, toast.js, formatDateTime.js, formatDisplayId.js,
  money.js, currency.js, nav.js, rbac.js, authToken.js, notificationDisplay.js,
  imageUpload.js, tablePagination.js, wholeNumber.js

  validation/     # forms / field errors / hardware / schedule
  products/       # mapProduct, pricing, addItem, CSV/import/export, variants, shelf
  control/        # controlTabs, mapStockMovement, controlCsv
  orders/         # mapPurchaseOrder, orderGenerate, PO invoice export
  suppliers/      # mapSupplier
  admin/          # adminLogs (+ filter config)
  branch/         # activity logs labels, performance, branch dashboard map
  inventory/      # IM dashboard map
  export/         # generic csv/pdf/invoice + admin/staff/tax-profit exporters
```

**Rules**

- Pure JS helpers only (formatters, mappers, export builders, validators).
- **No** React components, **no** hooks, **no** `apiClient` calls under `lib/`.
- New domain helpers go in the matching folder (`lib/products/…`), not the root.
- UI chips / table column defs live under `components/feature/…` (e.g. `OrderStatusBadge.jsx`, `controlTableColumns.jsx`).

---

## Data-fetching rule (consistency) — FROZEN

**Pages and layouts must not call `apiClient` / `endpoints` directly.**

Always go through a **hook** (or an exported helper from a hook module, or an existing RTK thunk wrapped by a hook).

### Default for NEW features

```
Page / Dialog  →  hooks/{domain}/useSomething.js  →  apiClient + endpoints
```

Use local `useState` / `useEffect` inside the hook for list/detail/mutate. Return a small, stable API to the UI (`items`, `loading`, `error`, `reload`, actions).

### When to use / extend RTK

Use or extend an existing slice **only if** the data is shared across many screens and caching matters today, e.g.:

- `auth`
- `products` (+ catalog)
- `orders`
- `control`
- dashboards already on RTK

Do **not** add a new RTK slice “for consistency.” Prefer a hook + `apiClient` unless you can write one sentence: *“This state must stay in sync across screens A, B, and C.”*

Existing RTK domains stay as:

```
Page  →  hooks/inventory|…/useX.js  →  rtk/features/.../slice  →  apiClient
```

### Auth

- Login / logout / session: use **`useAuth` / `AuthContext`** (facade over `authSlice`) or `useAuthSession` from `@/hooks/shared/useAuthSession`.
- Do not dispatch auth slice actions from random feature components unless you are inside auth infrastructure.

---

## Cross-links (page ↔ feature ↔ hook ↔ lib)

Use this table to find the “family” for a domain. Prefer extending these over inventing parallel files.

| Domain | Page(s) | Feature UI | Hook(s) | Lib / slice |
|--------|---------|------------|---------|-------------|
| Products / catalog | `pages/inventory/ProductsPage.jsx`, `AddItemPage`, `EditItemPage`, `CategoriesPage` | `feature/products/` | `hooks/inventory/useProducts.js`, `useVariantTypeCatalog.js` | `lib/products/*`, `rtk/features/products/` |
| Bundles | `pages/inventory/BundleFormPage.jsx` (+ Add/Edit wrappers) | (inline + shared product bits) | `hooks/inventory/useProducts.js` (`fetchProductDetail`) | `lib/products/mapProduct.js`, `lib/products/pricing.js` |
| Inventory control | `pages/inventory/InventoryControlPage.jsx` | `feature/control/` (+ `controlTableColumns.jsx`) | `hooks/inventory/useInventoryControl.js` | `lib/control/*`, `rtk/features/control/` |
| Purchase orders | `pages/inventory/PurchaseOrdersPage.jsx`, `OrderDetailPage.jsx`, `GenerateOrderPage.jsx` | `feature/orders/` (+ `OrderStatusBadge.jsx`) | `hooks/inventory/usePurchaseOrders.js`, `useOrderDetail.js` | `lib/orders/*`, `rtk/features/orders/` |
| Suppliers | `pages/inventory/SuppliersPage.jsx` | `feature/suppliers/` | `hooks/inventory/useSuppliers.js` | `lib/suppliers/mapSupplier.js` |
| Admin branches | `pages/admin/BranchesPage.jsx` | `feature/admin/branches/` | `hooks/admin/useAdminBranches.js` | `lib/export/csvExport.js` |
| Admin leaves | `pages/admin/LeavesPage.jsx` | `feature/admin/leaves/` | `hooks/admin/useAdminLeaves.js` | — |
| Admin logs | `pages/admin/AdminLogsPage.jsx` | `feature/admin/logs/` | `hooks/admin/useAdminLogs.js` | `lib/admin/*`, `lib/export/adminLogsExport.js` |
| Admin settings | `pages/admin/SettingsPage.jsx` | — (page-heavy) | `hooks/admin/useAdminSettings.js` + `fetchAdminBranchOptions` | — |
| Branch staff / roster | `pages/branch/StaffPage.jsx`, `AttendancePage`, `LeavesPage`, `HolidaysPage` | `feature/branch/staff/` | `hooks/branch/useBranchStaff.js`, `useBranchRosterOptions.js`, `useBranchDesignations.js` | `lib/validation/branchForms.js`, `lib/export/staffExport.js` |
| Branch sales | `pages/branch/SalesPage.jsx` | `feature/branch/sales/` | `hooks/branch/useBranchSales.js` | — |
| Branch discounts | `pages/branch/DiscountsPage.jsx` | — (page-heavy) | `hooks/branch/useBranchDiscounts.js` | `lib/validation/branchForms.js` |
| Branch inventory | `pages/branch/BranchInventoryPage.jsx` | `feature/branch/inventory/`, `demand-requests/` | `hooks/branch/useBranchInventoryCatalog.js` | `lib/products/shelfStockStatus.js` |
| Branch hardware | `pages/branch/ResourcesPage.jsx` | `feature/branch/resources/` | `hooks/branch/useBranchHardware.js` | — |
| Performance detail | `pages/branch/PerformanceEmployeePage.jsx` | `feature/branch/performance/` | `hooks/branch/useBranchPerformanceDetail.js` | `lib/branch/performance*.js` |
| Notifications | `pages/shared/NotificationsPage.jsx`, `layouts/Navbar/NotificationBell.jsx` | — | `hooks/shared/useNotifications.js` | `lib/notificationDisplay.js` |

---

## Soft size limits

| Kind | Soft target | Action if larger |
|------|-------------|------------------|
| Page | ~300 lines | Extract sections / dialogs into `feature/` |
| Dialog / tab | ~250 lines | Split subcomponents |
| Hook | ~200 lines | Split by concern or extract pure helpers to `lib/` |

These are guidelines for reviews, not hard CI gates.

---

## Naming conventions (JS / JSX)

| Kind | Pattern | Example |
|------|---------|---------|
| Page | `{Name}Page.jsx` | `ProductsPage.jsx` |
| Feature component | descriptive PascalCase | `ProductTable.jsx`, `AddStockInDialog.jsx` |
| Hook | `hooks/{domain}/use{Name}.js` | `hooks/inventory/useProducts.js` |
| Slice | `{domain}Slice.js` | `productsSlice.js` |
| Mapper / helper | `lib/{domain}/camelCase.js` (shared stay at `lib/` root) | `lib/products/mapProduct.js`, `lib/formatDateTime.js` |
| Paths | `PATHS.*` from `@/router/paths` | never hardcode role URLs in features |

Export named functions/components (`export function ProductsPage`) — match neighbors in the same folder.

---

## Checklist for a new screen (junior path)

1. Add path in `src/router/paths.js` and wire route in `src/router/index.jsx` (with correct layout + gate).
2. Create thin `pages/{role}/MyThingPage.jsx`.
3. Create `hooks/{domain}/useMyThing.js` that calls `apiClient` + `endpoints` (or wraps an existing slice).
4. Add UI under `components/feature/{domain}/`.
5. Reuse `shared/` / `ui/` for chrome and primitives.
6. Put mappers / formatters in `lib/{domain}/` (or `lib/` root if truly shared).
7. Toasts via `@/lib/toast` — keep API error strings user-facing and short.

**Do not** open a PR that mixes: folder moves + behavior changes + visual redesign.

---

## Golden examples (copy these patterns)

### 1. Thin page (orchestration only) — preferred page shape

| Piece | Path |
|-------|------|
| Page | `src/pages/inventory/OrderDetailPage.jsx` |
| Hook | `src/hooks/inventory/useOrderDetail.js` |
| Feature UI | `src/components/feature/orders/OrderDetailBody.jsx` (+ related) |
| Slice | `src/rtk/features/orders/ordersSlice.js` |

**Why golden:** Page wires params, hook, toasts, and layout. Heavy UI and API live elsewhere.

### 2. RTK-backed domain (shared list / catalog)

| Piece | Path |
|-------|------|
| Page | `src/pages/inventory/ProductsPage.jsx` |
| Hook | `src/hooks/inventory/useProducts.js` |
| Feature UI | `src/components/feature/products/` |
| Slice | `src/rtk/features/products/productsSlice.js` |
| Mapper | `src/lib/products/mapProduct.js` |

**Why golden:** Hook hides dispatch/`asResult`; page does not touch thunks for every action.

### 3. Hook + apiClient (no new slice) — default for NEW screens

| Piece | Path |
|-------|------|
| Page | `src/pages/admin/BranchesPage.jsx` |
| Hook | `src/hooks/admin/useAdminBranches.js` |
| Feature UI | `src/components/feature/admin/branches/` |
| Endpoints | `src/api/endpoints.js` → `admin.branches.*` |

Also good recent extracts: `useAdminLeaves`, `useBranchSales`, `useBranchDiscounts`, `useNotifications`.

**Why golden:** Local state in the hook, centralized URLs in `endpoints`, page stays UI-focused. **Copy this for most new features.**

### 4. Shared primitive + shared chrome

| Piece | Path |
|-------|------|
| UI primitive | `src/components/ui/button.jsx` |
| Shared chrome | `src/components/shared/PageHeader.jsx`, `ConfirmDialog.jsx`, `DeleteEntityDialog.jsx` |

### 5. API surface

| Piece | Path |
|-------|------|
| Client | `src/api/api.js` |
| Endpoints map | `src/api/endpoints.js` |
| Helpers | `src/api/apiHelper.js`, `src/api/result.js` |

### 6. Routing / access

| Piece | Path |
|-------|------|
| Path constants | `src/router/paths.js` |
| Gates | `src/router/guards/AuthGate.jsx`, `RoleGate.jsx`, `AdminAuthGate.jsx` |
| Layouts | `src/layouts/InventoryLayout.jsx`, `BranchManagerLayout.jsx`, `AdminLayout.jsx` |

---

## Anti-patterns (do not copy)

| Avoid | Do instead |
|-------|------------|
| `apiClient` inside a **page** or **layout** | Hook under `hooks/{domain}/` |
| Flat `@/hooks/useX` imports | `@/hooks/{domain}/useX` |
| New helpers dumped in `lib/` root | `lib/{domain}/…` (root only for truly shared) |
| New `.jsx` under `lib/` | `components/feature/{domain}/` |
| New `.ts` / `.tsx` files | Stay on `.js` / `.jsx` |
| New RTK slice with no cross-screen need | Hook + local state |
| Business logic dumped into `components/ui` | `feature/` or `lib/` |
| One-off dialog in `shared/` | `feature/{domain}/` |
| 800+ line page with inline form + table + API | Extract feature sections + hook |
| Hardcoded `/inventory/...` strings in nav | `PATHS` |
| Empty placeholder feature folders | Delete or document (`phase2/README.md`) |

---

## Known debt (do not expand)

Fix in dedicated PRs; do not make them worse:

1. Dual data styles (RTK vs hook-only) — **frozen:** new work prefers hook + `apiClient`; extend existing RTK only when shared.
2. **Hooks + `lib/` are grouped** (`hooks/{domain}`, `lib/{domain|export|validation}`). Do not re-flatten.
3. Fat pages (`BundleFormPage`, `SettingsPage`, `CompanyPage`, …) — thin out one file per PR (**Phase 4**).
4. Some **feature components** still call `apiClient` directly — migrate when you touch that dialog/panel; pages/layouts are clean.
5. `pages/phase2/` — placeholders only; see README there.

---

## PR review questions (consistency)

1. Is the new file in the right tier (`page` / `feature` / `shared` / `ui` / `hooks/{domain}` / `lib/{domain}`)?
2. Did the **page/layout** avoid direct API calls?
3. Did we reuse an existing golden pattern instead of inventing a fourth style?
4. Is the file over the soft size limit without a clear extract plan?
5. Are we still on **JS / JSX** only?

---

## Quick decision tree

```
Need a new UI screen?
  → pages/{role}/*Page.jsx (thin)
  → components/feature/{domain}/…
  → hooks/{admin|inventory|branch|shared}/use….js
       → shared across many screens already on RTK?  → wrap existing slice
       → otherwise                                 → apiClient + endpoints
  → pure map/format/export?
       → cross-cutting (date, money, toast)? → lib/ root
       → domain? → lib/{products|control|orders|…}/
       → CSV/PDF exporter? → lib/export/ (or domain if product-specific)
  → generic chrome?  → shared/ or ui/
```
