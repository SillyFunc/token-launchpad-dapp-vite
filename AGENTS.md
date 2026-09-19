# Project Agent Notes

## Paraglide JS i18n

- LLMS documentation: https://paraglidejs.com/llms.txt
- Vite integration uses `@inlang/paraglide-js` and `paraglideVitePlugin`.
- Supported locales: `en` and `zh-Hant`.
- Translation source files are stored in `messages/{locale}.json`.
- Paraglide configuration is stored in `project.inlang/settings.json` and `project.inlang/paraglide.config.js`.
- `src/paraglide/` is generated output — never edit it by hand.

### i18n rules (enforced)

- ALL user-facing strings (labels, toasts, validation messages, aria-labels, placeholders) must use `m.<key>()` from `@/paraglide/messages.js`. Never hardcode English or Chinese literals in components.
- When adding a message, add the key to BOTH `messages/en.json` and `messages/zh-Hant.json`, then run `pnpm i18n:compile`.
- zod schema error messages and aria-labels are user-facing too — they must use `m.*()`.

## External links & env

- Never hardcode external URLs (explorer, pancakeswap, defined.fi, RPC). Use helpers from `src/lib/web3.ts` (`getExplorerAddressUrl`, `getExplorerTransactionUrl`) and `src/lib/links.ts` (`getPairChartUrl`, `getPancakeSwapUrl`).
- Environment values are validated in `src/env/client.ts`. Add new `VITE_*` vars there and in `.env.example`. Optional overrides: `VITE_APP_DEX_API_URL`, `VITE_APP_RPC_URL`, `VITE_APP_RPC_WS_URL`.
- **`.env` files must be UTF-8 *without* a BOM.** On Windows, `Set-Content -Encoding UTF8` (PowerShell 5.1) writes a BOM, which makes Vite's `loadEnv` mis-parse the **first** key (it becomes `\uFEFFVITE_…`), so that variable resolves to `undefined` and env validation fails with `expected string, received undefined`. Write env files with `[System.IO.File]::WriteAllText(path, text, [System.Text.UTF8Encoding]::new($false))` instead.
  - This is easy to miss: `Get-Content`/`ReadAllText` silently strip the BOM, so a naive re-read looks fine. Verify with a byte check (`EF BB BF`) or by inspecting `loadEnv()` output.
  - `wrangler` tolerates a BOM in `workers/dex-cache/.dev.vars`, but keep those BOM-free too for consistency.

## Web3 conventions

- Platform chain is defined once in `src/lib/web3.ts` (`PLATFORM_CHAIN` / `PLATFORM_CHAIN_ID`). Deployment/contract addresses come from `src/lib/contracts.ts` accessors (`getCoordinatorFactory()`, `getDeployment()`) — never index `contracts[CHAIN_ID]` at module top-level in new code.
- `PLATFORM_CHAIN_ID` is a **decision-site constant**: it belongs only in `web3.ts`, `contracts.ts`, `use-contract-tx.ts`, and the wallet-chain guards (`web3-action-button.tsx`, `prelaunch.tsx`). **Reads must not pass it** — the wagmi config has a single chain, so an omitted `chainId` already resolves to BSC (see the invariant comment in `src/providers/web3-provider.tsx`). Writes keep it, because it turns on viem's `assertChainId` and fails loudly when the wallet sits on another chain.
- All backend HTTP goes through `src/lib/http/client.ts` (`get` / `postForm` / `postMultipart`); never call `axios`/`fetch` directly.
- **Contract writes go through `src/hooks/use-contract-tx.ts`**, the single place where we decide how writes are executed and confirmed. It owns the "send → wait for receipt" flow:
  - In React components: use `useWriteContractTx()` — it wraps wagmi's `useWriteContract` so `isPending` is tracked automatically (prevents double-clicks) and returns `{ hash, receipt }`.
  - In hooks or non-React code (or when you already hold a wagmi `Config`): use `executeContractTx(config, params)`.
  - Use `mutate` / `mutateAsync` from `useWriteContract()` (wagmi v3). `writeContract` and `writeContractAsync` are **deprecated** aliases — never call them, or `waitForTransactionReceipt`, directly in new code.
  - Left to the caller on purpose: toasts (wording is business-specific), query invalidation, parsing event logs from the receipt, and any post-transaction side effects (e.g. syncing to the backend).

## Market data (DEX Screener)

- Never call `api.dexscreener.com` from the browser. All DEX Screener access goes through the `dex-cache` Worker in `workers/dex-cache/` (CORS proxy + Upstash Redis cache) so the SPA cannot be rate-limited and credentials stay server-side.
- On the client, DEX data is fetched by `src/api/dex.ts` (`useDexQuotes` hook wraps it). This module talks to the Worker, **not** the platform backend, so it does not use the `{ code, message, data }` envelope client — do not route it through `@/lib/http/client.ts`. It throws `DexApiError` (not `ApiError`) so failures stay silent in the global query error handler and callers fall back to on-chain pricing.
- `VITE_APP_DEX_API_URL` configures the Worker origin; when unset, the board falls back to on-chain pricing only.
- `priceNative` is relative to the pair's quote token: only treat it as a BNB price when `quoteTokenAddress` equals `WRAPPED_NATIVE_ADDRESS` (`src/lib/web3.ts`). Otherwise use the on-chain price.
- `changePercent` on the board is the aggregator's real `change24h`. Never synthesize a baseline (the removed `localStorage` approach showed different numbers per browser). A token with no live market renders `--`.
- The Upstash token is a full read/write credential. It must only ever live in Worker secrets (`workers/dex-cache/.dev.vars` locally, `wrangler secret put …` in production). **Never** add it to `src/env/client.ts` or any `VITE_*` variable — Vite inlines those into the shipped bundle.
- Worker response contract: `{ quotes: Record<lowercasedTokenAddress, TokenQuote>, cache: 'HIT' | 'MISS' | 'STALE', timestamp }` plus an `x-cache` header. Only *opened* tokens are returned (real price **and** non-zero liquidity); one quote per token, taken from the highest-liquidity pool.
- A missing key in `quotes` means "no live market yet" — render `--`, not `0`.
- Worker changes must keep `npm test` (in `workers/dex-cache/`) green; it covers aggregation, filtering, validation, the DexTokenQuote field contract, and the MISS → HIT → STALE cache paths.
- `/quotes` is rate limited per IP (30/min) by a Workers runtime binding; see `wrangler.toml`. `test/run-all.mjs` runs against `wrangler.test.toml`, which disables the limit so the functional suites don't trip it — verify the 429 path against the real deployment instead.

### Cache backend: Upstash Redis (do not swap without re-reading this)

The cache lives in Upstash Redis so one upstream call serves every user globally. Two alternatives were evaluated and rejected — don't re-propose them without addressing the points below:

- **Workers KV** — same platform (no second account), but the free plan allows only **1,000 writes/day** (vs ~16K/day equivalent on Upstash free), and it is **eventually consistent with cached negative lookups**: after a MISS + write, a read may still report "key not found" for up to 60s. Cloudflare's own docs say KV is "not an ideal fit" for write-heavy, Redis-type workloads. It would *weaken* the hit rate and therefore increase upstream calls — the opposite of what this worker exists for.
- **Workers Cache API (`caches.default`)** — free and built in, but it relies on a **zone-level cache and therefore does not work on `*.workers.dev`** (confirmed in Cloudflare docs). It would silently never hit. Using it requires attaching the worker to a custom domain on a Cloudflare zone. It also does not collapse concurrent requests for the same resource.

## Component conventions

- Define components as arrow functions typed with `React.FC`, with an exported props interface named after the component:
  ```tsx
  export interface MyComponentProps {}
  export const MyComponent: React.FC<MyComponentProps> = () => {}
  ```
  (No `import React` needed — the `React` UMD namespace covers type usage.)

## Layout conventions

- `src/lib/` holds pure, framework-agnostic functions only. React hooks live in `src/hooks/` (e.g. `useVanitySalt` is in `src/hooks/use-vanity-salt.ts`, not `lib/`).

## Verification

- After changes, run `pnpm lint` (oxlint) and `pnpm build` (runs `i18n:compile`, `tsc -b`, `vite build`) to validate.

