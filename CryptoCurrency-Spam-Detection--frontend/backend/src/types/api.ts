export type AddressSummary = {
  totalReceived: number | string
  totalSent: number | string
  balance: number | string
  transactionCount: number
  unit: string
}

export type TransactionItem = {
  hash: string
  from: string
  to: string
  amount: number | string
  date: string
}

export type TransactionsResponse = {
  items: TransactionItem[]
  page: number
  limit: number
  total: number
}

export type RiskFactor = {
  id?: string
  title: string
  severity: 'Low' | 'Medium' | 'High'
  description?: string
  transactionQuery?: string
}

export type RiskResponse = {
  score: number
  factors: RiskFactor[]
}

export type ScreeningResponse = {
  matched: boolean
  reasons: string[]
  source: string
  categories: {
    scam: string[]
    phishing: string[]
    mixer: string[]
    ransomware: string[]
    stolenFunds: string[]
    darknet: string[]
  }
  entityLabel: 'exchange' | 'smart_contract' | 'bot' | 'mixer' | 'user_wallet' | string
  confidence: number
  stats: {
    txCount24h: number
    uniqueCounterparties: number
    repeatedInteractions: number
  }
}

export type WatchlistItem = {
  id: string
  address: string
  chain: string
  name?: string
  riskScore?: number
  lastActivity?: string
  alerts_enabled: boolean
}

export type AlertItem = {
  id: string
  type: 'risk_increase' | 'flagged_interaction' | 'large_transaction'
  title: string
  message?: string
  address: string
  chain: string
  createdAt: string
  read: boolean
}

export type AlertSettings = {
  telegram?: { botToken?: string; chatId?: string }
  discord?: { webhookUrl?: string }
  email?: { address?: string }
  rules?: {
    minimumAmount?: number
    minimumRiskScore?: number
    flaggedInteractionEnabled?: boolean
  }
}

export type GraphNode = {
  id: string
  address: string
  riskScore?: number
  flagged?: boolean
}

export type GraphEdge = {
  id: string
  source: string
  target: string
  amount?: number | string
}

export type GraphResponse = {
  center: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type TimeseriesPoint = {
  ts: string
  balance?: number
  inflow?: number
  outflow?: number
  txCount?: number
}

export type TimeseriesResponse = {
  range: string
  points: TimeseriesPoint[]
  topCounterparties?: Array<{ address: string; volume: number }>
}

export type DappProtocol = {
  id: string
  name: 'Uniswap' | 'Aave' | 'Curve' | 'Compound' | 'OpenSea' | string
  txCount: number
  totalVolume: number
  firstInteraction?: string
  lastInteraction?: string
  risk: 'Low' | 'Medium' | 'High'
}

export type DappsResponse = {
  protocols: DappProtocol[]
  flaggedInteractions?: Array<{ protocol: string; counterparty: string; reason: string }>
}

export type ApprovalItem = {
  token: string
  spender: string
  allowance: string
  approvalDate: string
  revokeRisk: 'Low' | 'Medium' | 'High'
  unlimited?: boolean
}

export type ApprovalsResponse = {
  items: ApprovalItem[]
}

export type BatchAnalyzeResult = {
  address: string
  name?: string
  chain?: string
  riskScore?: number
  transactionCount?: number
  status: 'queued' | 'processing' | 'done' | 'failed' | string
  error?: string
}

export type BatchAnalyzeResponse = {
  results: BatchAnalyzeResult[]
}

export type Team = {
  id: string
  name: string
  description?: string
  role: 'Viewer' | 'Analyst' | 'Admin'
}

export type TeamActivityItem = {
  id: string
  createdAt: string
  actor: string
  action: string
  meta?: Record<string, unknown>
}

export type TxComment = {
  id: string
  hash: string
  message: string
  createdAt: string
  author: string
  mentions?: string[]
  flagged?: boolean
}

export type ApiKey = {
  id: string
  name: string
  key: string
  permissions: 'read' | 'write' | 'admin'
  tier: 'free' | 'pro' | 'enterprise'
  isActive: boolean
  expiresAt: string | null
  lastUsedAt: string | null
  callCount: number
  createdAt: string
}

export type OrganizationKeysResponse = {
  keys: ApiKey[]
  usage: Array<{ day: string; calls: number }>
  rateLimitWarning: string | null
}

export type ChainStatus = {
  chain: string
  currentBlock: number
  lastIndexedBlock: number
  behind: number
  healthy: boolean
  latencyMs?: number
}

export type IndexerStatusResponse = {
  chains: ChainStatus[]
  performance: Array<{
    ts: string
    blocksPerMinute: number
    avgLatencyMs: number
    queueDepth: number
  }>
}

export type SimulationResult = {
  success: boolean
  from: string
  to: string
  amount: number
  chain: string
  gasEstimate?: number
  gasCostEth?: number
  riskFlags: string[]
  toRiskScore: number
  fromRiskScore: number
  recommendation: 'safe' | 'caution' | 'block'
  details: string
  simulatedAt: string
}

