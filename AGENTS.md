# Project Agent Notes

## To Agent
+ I’m excited to explore and create alongside you (Agent), and I hope we can communicate effectively. Here is a set of guidelines I’ve prepared for you to use as a reference.
+ Architecture isn’t always correct; abstractions from the past may no longer be applicable today. Evolving the architecture at the right time can fundamentally prevent complex problems from arising. Conversely, when a particular feature frequently encounters difficult issues, we need to consider whether changes to the architecture are necessary.
+ Building software inevitably involves encountering various issues, and we’re constantly called upon to solve them. A golden rule for problem-solving is the first-principles approach: getting back to the essence of the problem is the first—and most important—step toward a solution.
+ Once the core issue is identified, continue analyzing the root causes. Then, considering the overall constraints, seek the optimal solution to avoid getting bogged down in short-term fixes that only address the immediate symptoms.
+ There’s always more than one way to solve a problem; we tend to choose the simplest and most reliable solution. The KISS principle is key to keeping things simple, understandable, and maintainable.
+ When you discover a bug, first consider why the tests didn’t catch it, then write a minimal test that reliably reproduces the issue and confirms the failure; next, fix the root cause; and finally, perform regression testing that matches the scope of the changes. If the issue cannot be automatically reproduced, document the minimum reproducible steps. Testing incurs maintenance costs, so it should be kept necessary and streamlined, focusing on risks and boundaries.
+ Nothing is set in stone. If you think this guide could be improved, feel free to let me know—I’d be happy to work with you to refine it.

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
