# Page dependency trees

## `/` — Treasury dashboard and setup
Entry: `app/page.tsx`

- `app/layout.tsx`
  - `app/globals.css`
  - `app/providers.tsx`
    - `lib/safe-app-connector.ts`
    - `lib/treasury-context.tsx`
- `app/page.tsx`
  - `connectkit` `ConnectKitButton`
  - `app/components/Vault.tsx`
    - `app/components/TreasurySetup.tsx`
    - `app/components/DepositCard.tsx`
    - `app/components/WithdrawCard.tsx`
    - `app/components/ObligationCard.tsx`
      - `app/components/LiquidityTimeline.tsx`
      - `app/components/RiskBadge.tsx`
    - `app/components/StrategyCard.tsx`
    - `app/components/ShortfallAlert.tsx`
    - `app/components/ui.tsx`
    - `lib/contracts.ts`
    - `lib/format.ts`
    - `lib/useObligations.ts`
    - `lib/useTx.ts`
    - `lib/treasury-context.tsx`

Visible states include wallet disconnected, wrong chain, no/configured treasury, create/connect setup, loading/read failure, active treasury, pending/confirmed/failed/cancelled transaction, healthy/shortfall liquidity, active/overdue obligations, empty/recent activity, and keeper heartbeat missing/healthy/degraded.
