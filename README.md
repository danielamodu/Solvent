# Solvent — onchain treasury management

**Solvent stops crypto treasuries from spending money they've already promised to pay.**

A team records payment obligations onchain. The vault counts every pending obligation (plus a reserve) as *protected liquidity* and refuses to deploy a single unit of it to yield strategies. Pay first, deploy what's free. Live on **Arbitrum Sepolia**.

## Judge quickstart (3 minutes, no wallet needed to view)

```bash
npm install
npm run dev        # http://localhost:3000
```

Then open **`/demo`** — it loads the pre-seeded stage treasury straight into the live dashboard:

1. See $48,000 total, $5,000 protected, $43,000 deployable — all read live from chain.
2. Create a $2,000 obligation due *yesterday* (Obligations card). The alert fires.
3. Try deploying $45,000 to the strategy. **The contract reverts** — that money is promised.
4. The keeper settles the overdue payment on its next tick (≤60s, heartbeat dot goes green).
5. Protected drops, deployable jumps. That's the whole product.

To act (deposit, create, deploy), connect a wallet on Arbitrum Sepolia with a little Sepolia ETH; the SUSD faucet card mints test funds for free.

## Live deployments (Arbitrum Sepolia, chain ID 421614)

| Contract | Address | Arbiscan |
|---|---|---|
| TreasuryFactory (current, whitelist + nonce + Aave) | `0xf5017FC38550fE27809EF67C1EFB7Ec4f7e861cd` | [contract](https://sepolia.arbiscan.io/address/0xf5017FC38550fE27809EF67C1EFB7Ec4f7e861cd) / [deploy tx](https://sepolia.arbiscan.io/tx/0xb7abc6b8322d317c8645912f2202d087e931fe875d5acf461959d1e263d35b90) |
| Stage treasury vault (seeded demo) | `0x371126527486AFE308EDd726246BeF66eD8501d3` | [contract](https://sepolia.arbiscan.io/address/0x371126527486AFE308EDd726246BeF66eD8501d3) / [creation](https://sepolia.arbiscan.io/tx/0x7419d2c515c03225c88ed4a4db2839f2c8fd8936242ae9436a6bacd2c1a12b97) |
| Stage obligation registry | `0x64C868F527A73e7b0521e5425BcB5632c2a6f600` | [contract](https://sepolia.arbiscan.io/address/0x64C868F527A73e7b0521e5425BcB5632c2a6f600) |
| Stage strategy (MockStrategy, SUSD) | `0x1264a06adb9fb614246C53CCD6F4C3dFA086431D` | [contract](https://sepolia.arbiscan.io/address/0x1264a06adb9fb614246C53CCD6F4C3dFA086431D) |
| SolventUSD (SUSD, test faucet token) | `0x6102e581816b903d1a6FcE3C6adCF9861341785F` | [contract](https://sepolia.arbiscan.io/address/0x6102e581816b903d1a6FcE3C6adCF9861341785F) |
| Aave V3 USDC reserve (official) | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` | [contract](https://sepolia.arbiscan.io/address/0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d) |
| Aave V3 pool | `0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff` | [contract](https://sepolia.arbiscan.io/address/0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff) |
| Aave aUSDC token | `0x460b97BD498E1157530AEb3086301d5225b91216` | [contract](https://sepolia.arbiscan.io/address/0x460b97BD498E1157530AEb3086301d5225b91216) |

Source verification for the factory is in progress (flattened source at `contracts/flattened/TreasuryFactory.flat.sol`).

## How it works

- **TreasuryFactory** (`contracts/src/TreasuryFactory.sol`) — one transaction spawns an atomically wired vault + obligation registry + strategy, owned by the caller (EOA or Safe). Official Aave USDC routes to the yield adapter; everything else gets the principal-only mock.
- **TreasuryVault** (`contracts/src/TreasuryVault.sol`) — custody with `deployableCapital = totalAssets − protectedLiquidity − totalDeployed`. Every strategy entrypoint requires owner authorization.
- **ObligationRegistry** (`contracts/src/ObligationRegistry.sol`) — the ledger of promises; nonce-based ids, running outstanding total, settlement moves real funds.
- **AaveV3UsdcStrategy** (`contracts/src/AaveV3UsdcStrategy.sol`) — testnet adapter verified against Aave's official address book.
- **Keeper** (`keeper/`) — off-chain worker watching every owner treasury: settles overdue obligations, recalls shortfalls. Simulate-first, capped, never crashes a tick.
- **Indexer + app** — event-sourced activity/alerts into SQLite by default, shared Postgres when `SOLVENT_DATABASE_URL` is set.

## Reproduce it yourself

```bash
npm run release-check   # read-only: chain, bytecode, wiring, factory version
npm run indexer         # supervised event indexer (needs SOLVENT_DATABASE_PATH)
cd keeper && npx ts-node index.ts                     # live keeper
cd keeper && KEEPER_DRY_RUN=true KEEPER_ONCE=true npx ts-node index.ts   # safe preview
```

Foundry: `cd contracts && forge test` — 46 tests (set `HOME=$USERPROFILE` on Windows first).

## Docs

- `IMPLEMENTATION.md` — deployment log, verification results, known limitations.
- `keeper/README.md` — keeper safety rules and configuration.
- `.env.example` — every variable, with the two storage modes explained.

## Known limitations (honest)

- Testnet-only, unaudited — do not put real funds in.
- Revoking a strategy also blocks recall until re-authorized (fail-closed by design, fix queued post-submission).
- The keeper signs as an EOA: Safe-owned vaults are watched but skipped for writes.
- Aave yield on tiny fresh positions rounds to ~zero; the adapter is integration, not income.
