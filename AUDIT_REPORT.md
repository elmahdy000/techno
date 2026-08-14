# TechnoMarket Marketplace — Audit Report

Date: 2026-08-14
Repo: https://github.com/elmahdy000/techno
Branch: `main` (all commits pushed)

## Scope

Full audit of the multi-vendor marketplace (Next.js 15 / React 19 / Prisma + Postgres / NextAuth v5), covering:

- Internationalization (en/ar) completeness and correctness
- Page metadata / SEO titles across all locales
- Financial integrity: refunds → vendor wallet reversal, withdrawals, ledger
- Database schema, migrations, and seed idempotency
- Code quality: lint, unused imports, error handling
- UI correctness: hydration errors, loading/error states, PWA
- End-to-end verification of customer, vendor, and admin flows

## Findings & Fixes

### 1. Internationalization

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1.1 | High | Hardcoded English strings in admin/vendor counts, badges, and status labels | Localized via dictionary (`t.admin`, `t.vendor`, `t.misc`) |
| 1.2 | High | Server actions threw raw English error messages | Added `src/i18n/errors.ts` mapping string codes → localized messages via `getErrorMessage` |
| 1.3 | Medium | Page titles were static English `metadata` | Converted ~40 pages to async `generateMetadata` using a new `pageTitle(locale, key)` helper (44-title `titles` section) |
| 1.4 | Low | Missing `titles.product` fallback key | Added; category/product pages fall back to localized generic titles |

### 2. Financial integrity (refunds → wallet)

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 2.1 | Critical | Admin return approval did not reverse the vendor's earned credit | `decideReturn` now calls `reverseVendorCredit` for PAID orders (SKIP reversal for unpaid COD), writes a `refund` row and `ORDER_REVERSAL` ledger entry |
| 2.2 | High | Wallet updates were not atomic; TOCTOU race on withdrawals | `debitWalletForWithdrawal` uses conditional `updateMany` with balance guard; approval flips status only inside the same transaction |
| 2.3 | Medium | Missing wallets were possible (`wallet.findUnique` crash) | Added `ensureWallet` upsert helper |
| 2.4 | Low | Dead wallet code left over from earlier iterations | Removed |

### 3. Database, migrations, seed

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 3.1 | High | Missing unique constraint on default address | Added migration `unique-default-address`, applied to the live DB via `prisma db execute` |
| 3.2 | Medium | Seed was not idempotent (double-run errors) | Made seed idempotent; `SEED_PASSWORD` env override |
| 3.3 | Low | Shipping config in minor units was inconsistent in seed | Standardized minor-unit values |

### 4. Code quality / build

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 4.1 | Medium | No ESLint configuration | Added `eslint.config.mjs` (flat config, Next/TS/import/a11y); fixed unused imports across ~18 files |
| 4.2 | Low | No PWA manifest/service worker | Added `public/sw.js`, `app/manifest.ts`, `register-sw.tsx` |
| 4.3 | Low | No loading/error UI | Added loading skeletons (cart, catalog, checkout, product) and a locale error boundary |

### 5. Bugs found during E2E (post-audit fixes)

| # | Severity | Finding | Fix (commit) |
|---|----------|---------|--------------|
| 5.1 | High | Invalid HTML in admin overview recent-orders: `statusBadge` (a `<div>`) nested inside a `<p>` → React hydration error | Wrapped in `<div>` — `e065554` |
| 5.2 | Medium | `WishlistButton` called `setOptimistic` outside a transition → React warning | Wrapped optimistic update in `startTransition` — `5ef6d1a` |
| 5.3 | High | Admin ticket detail thread rendered a `<Badge>` (`<div>`) inside a `<p>` → hydration error | Switched the sender row to a `<div>` — `3cc6432` |

## Verification

### Static checks (all green)

```
npx tsc --noEmit   ✓
npx eslint .       ✓
npm run build      ✓
```

### End-to-end (Playwright, headless Chromium, live DB)

Round 1 — core flows, **13/13 passed**
Homepage · catalog · product metadata · Arabic locale · add-to-cart · COD checkout (order placed) · vendor orders · vendor inventory · admin dashboard · admin returns · admin support · Arabic admin metadata · no console errors.

Round 2 — remaining flows, **17/17 passed**
- **Return**: customer requests return on delivered item → admin approves → `refund` created (amount, method CARD), `ORDER_REVERSAL` ledger entry, vendor wallet reversed 1,394,907 → 0 ✓
- **Withdrawal**: vendor requests (2000 EGP) → admin approves → wallet debited, `WITHDRAWAL` ledger entry ✓; insufficient-balance request correctly rejected ✓
- **Review**: customer submits (verified purchase) → PENDING → admin publishes → PUBLISHED, product rating recomputed ✓
- **Wishlist / compare / search**: toggle + page render verified ✓
- **No console errors** ✓

Round 3 — locale + fulfillment + support coverage, **26/26 passed**
- **Arabic-locale flows**: return request, withdrawal request, and review submission all completed end-to-end under `/ar` (RTL rendering, Arabic labels, Arabic admin moderation) ✓
- **Vendor shipping**: CARD (simulated) checkout creates a PENDING shipment → vendor marks shipped (carrier + tracking) → delivered; PAID order settles wallet pending → available with `ORDER_CREDIT` ledger (NileTech 5,114,907 → 9,485,814) ✓
- **Admin support tickets**: customer creates ticket → admin replies → thread + status verified ✓
- **No console errors** ✓

Round 4 — CRUD + config + account coverage, **35/35 passed**
- **Vendor product CRUD**: create (Name/Brand + variant SKU/Name/Price/Stock) → edit → delete (confirm dialog) ✓
- **Vendor inventory**: stock delta + reason adjustment → `RESTOCK` inventory log ✓
- **Vendor commission + profile**: commission page renders; profile phone update ✓
- **Admin users**: deactivate → reactivate karim ✓
- **Admin vendors**: suspend → reactivate DigiParts ✓
- **Admin commission**: default rate 7→8→7, per-vendor override set then cleared ✓
- **Account**: add address (dialog), cart quantity increase/decrease/remove → empty state, notifications mark-all-read, category browsing (`/category/laptops`), settings save ✓
- **PWA**: `/sw.js` + `/manifest.webmanifest` served 200; `navigator.serviceWorker` available ✓
- **No console errors** ✓

Test data was cleaned up after each run; the DB was returned to the 3-order seed state.

## Commits

- `87ecb26` feat: complete marketplace audit fixes (143 files)
- `e065554` fix(admin): fix hydration error from div nested in p tag
- `5ef6d1a` fix(wishlist): wrap optimistic update in startTransition
- `9e1165b` docs: add marketplace audit report
- `3cc6432` fix(admin): fix hydration error from Badge nested in p tag

All pushed to `origin/main` (branch now in sync).