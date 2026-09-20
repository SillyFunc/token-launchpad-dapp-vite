# src/contracts — 链上合约的唯一事实来源

这里存放 dapp 直接消费的合约 ABI 与部署地址，**不是**本地手写的代码。所有文件都从合约仓库复制而来，请勿在本地修改内容（发现不一致时去合约仓库改，再重新复制）。

## 来源

| 内容 | 来源文件 | 合约仓库 commit |
|---|---|---|
| `abis/*.ts` | `token-launchpad-contracts/out/<Contract>.sol/<Contract>.json` 的 `abi` 字段 | `0f03263` (`codex/fix-buyback-vault`) |
| `addresses.ts` | `token-launchpad-contracts/script/deployments/{56,97}.json` | 同上 |

合约仓库本地路径：`D:/gh-projects/token-launchpad-contracts`。

## 更新时机与方法

当合约仓库重新编译 / 重新部署后：

1. **ABI**：从 `out/<Contract>.sol/<Contract>.json` 读出 `abi` 字段，原样替换对应 `abis/*.ts` 文件里的数组。**必须保留末尾的 `as const`**，否则 viem/wagmi 的函数名/参数类型推断会失效。
2. **地址**：对照 `script/deployments/<chainId>.json` 更新 `addresses.ts`，保留 `as const satisfies Record<number, Record<string, Address>>`。

## 消费约定

- 业务代码一律从 `@/contracts` 导入，不要直接 import `abis/` 下的文件。
- 地址通过 `getDeployment()` / `getCoordinatorFactory()` / `getBuybackVaultFactory()` 访问（lazy，跟随 `PLATFORM_CHAIN_ID`），不要在模块顶层用 `addresses[CHAIN_ID]` 硬索引。
- `tokenFactoryAbi` / `presaleFactoryAbi` 暂未复制——dapp 当前没有消费方；需要时按上面的方法从 `out/` 补充。
