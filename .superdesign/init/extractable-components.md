# Extractable UI components

## Layout
- `TreasuryPageShell` — source `app/page.tsx` — dashboard header and content frame — props: none; hardcode brand/content.
- `WalletConnect` — source `app/page.tsx` (ConnectKitButton) — wallet connect/account control — props: none.

## Basic
- `Stat` — source `app/components/Vault.tsx` — metric tile — props: label, bigint value, decimals, loading.
- `TxFeedback` — source `app/components/ui.tsx` — transaction state and explorer link — props: tx state, className.
- `Skeleton` — source `app/components/ui.tsx` — read loading placeholder — props: className.
- `BusyLabel` — source `app/components/ui.tsx` — spinner plus button label — props: busy, children.
- `RiskBadge` — source `app/components/RiskBadge.tsx` — liquidity risk classification.
- `TreasuryActivity` — source `app/components/Vault.tsx` — indexed event history per vault.
- `ReadinessAlerts` — source `app/components/Vault.tsx` — obligation timing and liquidity alerts.
