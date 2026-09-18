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
- Environment values are validated in `src/env/client.ts`. Add new `VITE_*` vars there and in `.env.example`. Optional overrides: `VITE_APP_RPC_URL`, `VITE_APP_RPC_WS_URL`.

## Web3 conventions

- Platform chain is defined once in `src/lib/web3.ts` (`PLATFORM_CHAIN` / `PLATFORM_CHAIN_ID`). Deployment/contract addresses come from `src/lib/contracts.ts` accessors (`getCoordinatorFactory()`, `getDeployment()`) — never index `contracts[CHAIN_ID]` at module top-level in new code.
- All backend HTTP goes through `src/lib/http/client.ts` (`get` / `postForm` / `postMultipart`); never call `axios`/`fetch` directly.

## Layout conventions

- `src/lib/` holds pure, framework-agnostic functions only. React hooks live in `src/hooks/` (e.g. `useVanitySalt` is in `src/hooks/use-vanity-salt.ts`, not `lib/`).

## Verification

- After changes, run `pnpm lint` (oxlint) and `pnpm build` (runs `i18n:compile`, `tsc -b`, `vite build`) to validate.

