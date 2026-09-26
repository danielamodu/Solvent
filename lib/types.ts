export type ObligationStatus = 'PENDING' | 'FUNDED' | 'SETTLED' | 'CANCELLED' | 'DEFAULTED'

export type ObligationPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export interface Treasury {
  id: string
  owner: string
  asset: string
  totalAssets: bigint
  protectedLiquidity: bigint
  deployedCapital: bigint
  availableCapital: bigint
}

export interface Obligation {
  id: string
  treasury: string
  beneficiary: string
  amount: bigint
  asset: string
  dueAt: number
  priority: ObligationPriority
  status: ObligationStatus
}

export interface Position {
  id: string
  treasury: string
  strategy: string
  principal: bigint
  currentValue: bigint
  withdrawable: bigint
}
