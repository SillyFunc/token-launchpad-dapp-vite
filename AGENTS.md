# Project Agent Notes

## i18n (Paraglide JS)

- Locales: `en`, `zh-Hant`. Sources in `messages/{locale}.json`.
- `src/paraglide/` is generated — never edit by hand.
- All user-facing strings (labels, toasts, validation, aria-labels, zod messages) use `m.<key>()` from `@/paraglide/messages.js`. Never hardcode literals in components.
- New message → add to both JSON files → run `pnpm i18n:compile`.

## Env & external URLs

- New `VITE_*` vars go in `src/env/client.ts` + `.env.example`.
- Explorer / PancakeSwap / chart URLs: use helpers in `src/lib/web3.ts` (`getExplorerAddressUrl`, `getExplorerTransactionUrl`) and `src/lib/links.ts` — never hardcode.
- **`.env` must be UTF-8 without BOM.** PowerShell 5.1 `Set-Content -Encoding UTF8` adds a BOM, which corrupts the first key for Vite's `loadEnv` (`VITE_…` becomes `\uFEFFVITE_…` → `undefined`). Write with `[System.IO.File]::WriteAllText(path, text, [System.Text.UTF8Encoding]::new($false))`.

## Contracts & Web3

- Chain + `PLATFORM_CHAIN_ID` in `src/lib/web3.ts` (currently BSC testnet, 97); contract ABIs/addresses in `src/contracts/` — access via its accessors, never hardcode.
- Backend HTTP: `src/lib/http/client.ts`. Contract writes: `src/hooks/use-contract-tx.ts` (owns chain assertion + receipt); don't call wagmi's `writeContract`/`waitForTransactionReceipt` directly.

## Code style

- Components: arrow function + `React.FC`, exported props interface named after the component. No `import React` needed.
- `src/lib/` = pure framework-agnostic functions; React hooks live in `src/hooks/`.

## Verify

- After changes: `pnpm lint` (oxlint) and `pnpm build` (`i18n:compile` + `tsc -b` + `vite build`).
