# Solvent keeper

A lightweight off-chain worker that watches treasury obligations and acts when
human attention would otherwise be required. It is a **separate process** — it
is not imported by the Next.js app and it never deploys capital on its own.

The contract is always the authority. The keeper only calls functions the
owner is already allowed to call:

- **Settle** any `PENDING` obligation that is **overdue** (`dueAt < now`).
- **Recall** capital from the strategy to cover any `PENDING` obligation coming
  **due within 48h** when the idle balance can't cover it.

Everything else it leaves alone.

## How a tick works

Every `KEEPER_INTERVAL_MS` (default 60s), and once immediately on start:

1. Discover treasuries: `getTreasuries(owner)` on the factory (owner defaults
   to the signer, override with `KEEPER_OWNER_ADDRESS`), resolving each
   vault's registry/strategy on-chain, plus the legacy treasury when configured.
2. Per treasury, read live state: `totalAssets`, `availableBalance`, `protectedLiquidity`,
   the vault's `strategyPositions[strategy]`, and the strategy's
   `availableLiquidity`.
2. Load every obligation (event-sourced from `ObligationCreated`, same as the
   web app) and keep only the `PENDING` ones.
3. For each, soonest-due first:
   - **Overdue** → recall just enough to fund it (if needed), then `settleObligation(id)`.
   - **Due < 48h** and idle balance short → `recallFromStrategy(strategy, shortfall)`.
4. Log the action and the resulting transaction hash.

### Safety rules (enforced in code)

1. Never recall more than is actually recoverable — capped by both
   `strategyPositions[strategy]` and the strategy's `availableLiquidity`, and
   decremented across a tick so it never over-recalls.
2. Never act on an obligation that isn't `PENDING`.
3. When `availableBalance > protectedLiquidity` the treasury is healthy, so no
   recall is issued. (Overdue obligations are still settled — that's the point.)
4. If a transaction reverts, it's logged and the loop continues.
5. If the RPC is unreachable, it's logged and retried next tick. A bad tick
   never crashes the keeper.

Every write is **simulated first**, so reverts are caught before gas is spent.

A vault whose owner is not the keeper signer (e.g. Safe-owned) is reported
but skipped for writes — the keeper logs a warning per tick instead of
spamming reverts. For Safe-owned treasuries, either run the keeper with a
signer the vault accepts or propose the keeper's calldata through the Safe
(signatures remain human-approved).

## Configuration

Reads the project's root `.env` (one level up — `../.env`). No separate env
file. Required:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC` | RPC endpoint |
| `NEXT_PUBLIC_TREASURY_FACTORY_ADDRESS` | Factory for multi-treasury discovery (preferred) |
| `NEXT_PUBLIC_TREASURY_VAULT_ADDRESS` | Legacy single treasury — merged in when all three legacy addresses are set |
| `NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS` | Legacy single treasury registry |
| `NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS` | Legacy single treasury strategy |
| `PRIVATE_KEY` | Owner key — the keeper signs as the vault/registry owner |

Optional:

| Variable | Default | Purpose |
| --- | --- | --- |
| `KEEPER_OWNER_ADDRESS` | signer address | Treasury owner to watch on the factory |
| `KEEPER_HEARTBEAT_URL` | — | Where to POST per-vault status (dashboard reads it) |
| `KEEPER_HEARTBEAT_TOKEN` | — | Bearer token for the heartbeat endpoint (≥24 chars, must match the web process) |
| `NEXT_PUBLIC_TREASURY_FACTORY_DEPLOY_BLOCK` | `0` | First block to scan (factory creation scans fall back to `NEXT_PUBLIC_OBLIGATION_REGISTRY_DEPLOY_BLOCK`) |
| `KEEPER_INTERVAL_MS` | `60000` | Tick interval |
| `KEEPER_DRY_RUN` | `false` | Decide and log, but send **no** transactions |
| `KEEPER_ONCE` | `false` | Run a single tick, then exit |
| `NEXT_PUBLIC_OBLIGATION_REGISTRY_DEPLOY_BLOCK` | `0` | First block to scan for obligations |

> The `PRIVATE_KEY` in `.env` is a real testnet key that controls the owner
> account. Keep `.env` gitignored; never commit it.

## Running

Dependencies resolve from the repo root `node_modules` (viem is already there;
`ts-node` and `dotenv` were added to the root `devDependencies`). From the repo
root run `npm install` once, then:

```bash
cd keeper
npx ts-node index.ts
```

Dry run a single tick first to see what it *would* do without sending any
transaction (recommended before pointing it at a live treasury):

```bash
cd keeper
KEEPER_DRY_RUN=true KEEPER_ONCE=true npx ts-node index.ts
```

(PowerShell: `$env:KEEPER_DRY_RUN="true"; $env:KEEPER_ONCE="true"; npx ts-node index.ts`)

Alternatively, install the keeper's own dependencies and use the script:

```bash
cd keeper
npm install
npm start
```

## Example output

```
[2026-09-28 14:32:01] START — keeper online as 0x0B67...C144
[2026-09-28 14:32:01] TICK — totalAssets: 500 USDC, available: 75 USDC, protected: 355 USDC, obligations: 3
[2026-09-28 14:32:02] RECALL — obligation 0x1234...abcd due in 23.4h, shortfall 25 USDC, recalling 25 USDC
[2026-09-28 14:32:06] TX — 0xabcd...def0 (confirmed)
[2026-09-28 14:33:01] SETTLE — obligation 0x5678...efgh overdue by 2.3h, settling 75 USDC to 0x9abc...1234
[2026-09-28 14:33:05] TX — 0xdef0...0123 (confirmed)
[2026-09-28 14:34:01] IDLE — no action required
```
