# Solvent implementation and release notes

This release targets **Arbitrum Sepolia** and the SolventUSD (SUSD) address already configured by the operator. The TreasuryFactory has been deployed and its transaction receipt verified on-chain.

## Implemented areas

1. **Treasury creation and discovery** — `TreasuryFactory` deploys an atomically wired vault and obligation registry. For the official Aave V3 Arbitrum Sepolia USDC reserve it deploys `AaveV3UsdcStrategy`; for other tokens (including the operator's Solvent USD, SUSD) it deploys the principal-only `MockStrategy`. The caller owns the vault and registry (a Safe can call it). Owners can connect an existing vault; the browser validates the vault/registry relationship and optional strategy wiring.
2. **Team approvals** — the frontend supports the Safe web app connector. When treasury creation runs from a Safe, that Safe is the onchain owner and Safe’s configured threshold applies to owner actions. Existing EOA-owned deployments need their ownership transferred to a Safe separately. The current standalone keeper signs as an EOA and cannot execute Safe-owned actions.
3. **Persistent alerts and keeper health** — SQLite stores alert records and keeper heartbeats. The keeper can post authenticated status to `/api/keeper/heartbeat`; the dashboard reads the last heartbeat. Set a randomly generated `KEEPER_HEARTBEAT_TOKEN` of at least 24 characters in both processes.
4. **Activity indexing** — `npm run indexer` scans Arbitrum Sepolia events in bounded 2,000-block ranges, persists checkpoints, and serves the latest 50 events from the local API. Factory-created treasuries are discovered from the factory event; the existing `.env` treasury remains supported.
5. **Strategy/deployment path** — `AaveV3UsdcStrategy` supplies the official Arbitrum Sepolia USDC reserve into Aave V3, reports aToken value and available reserve liquidity, and lets the owner harvest accrued testnet interest to the vault. The bundled MockStrategy remains principal-only. This adapter is for testnet integration work and is not audited or suitable for real funds.
6. **Security/release checks** — `npm run release-check` performs read-only checks for chain id, deployed bytecode, vault/registry wiring, asset matching, optional strategy wiring, and heartbeat token configuration. Factory and wiring tests are in `contracts/test/TreasuryFactoryTest.t.sol`.

## Operator setup

1. Set `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC`, the SolventUSD (SUSD) token, and the existing vault, registry, and strategy addresses as they are currently configured.
2. The factory is already deployed on Arbitrum Sepolia:

   - Address: `0x4f1294169e835402541ef58bBc332AF3Dd92EDeA`
   - Transaction: `0x225073eb5717a4fd849056e983a37530eea779c757e86591d70719c24eb6fb22`
   - Block: `314093176`
   - Chain ID: `421614`

   The transaction receipt succeeded, names this address as the created contract, and the address has deployed bytecode. `.env` is configured with this verified address and block. The alternate address `0x4f1d36cd625268a08cf7dc5310cde67b3202edea` from the initial handoff is incorrect and has no deployed code. This deployed version predates the Aave adapter; deploy the updated factory before creating an Aave-backed treasury.
3. Restart the web app and indexer after configuring the environment.
4. Set the same `SOLVENT_DATABASE_PATH` on the web process and indexer. Use a durable writable volume on a single Node host; this SQLite implementation is not a serverless or multi-replica database.
5. Run `npm run indexer` as a supervised process. Run `npm run release-check` before exposing the deployment.
6. Configure the keeper endpoint and token, then run it separately using the keeper instructions. Avoid configuring the keeper EOA against a Safe-owned vault; it will not satisfy Safe ownership checks.

## Known release gates

- The production Next.js build passes. The Foundry build could not be run in this environment because Foundry panics while detecting the user home directory; Claude previously reported 38 passing Foundry tests.
- Deploy the updated factory after compiling it; the currently configured factory does not create Aave strategies.
- Exercise the treasury create flow end to end on Arbitrum Sepolia and verify the created vault and registry.
- The SQLite app/indexer must share a durable disk path.
- Do not treat MockStrategy results as yield. No protocol strategy has been selected or integrated.
- Existing deployments do not gain Safe ownership automatically; ownership transfer is a deliberate onchain action.
