import { Search, ShieldAlert } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="glass mx-auto w-full max-w-4xl p-8">
      <div className="flex flex-col items-center text-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <Search className="h-6 w-6 text-amber-400" />
        </div>
        <div className="mt-4 text-lg font-semibold text-gray-100">
          Enter a wallet address to investigate
        </div>
        <div className="mt-1 max-w-xl text-sm text-gray-400">
          Paste any blockchain wallet address to retrieve its full transaction history,
          risk score, sanctions status, and behavioral analysis.
          Supports EVM addresses (starts with <span className="text-gray-200">0x</span>, 42 chars)
          and Bitcoin addresses (starts with <span className="text-gray-200">bc1</span>,{' '}
          <span className="text-gray-200">1</span>, or <span className="text-gray-200">3</span>).
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 w-full max-w-2xl">
          {[
            { icon: '🔍', label: 'Address Lookup', desc: 'Balance, history, entity label' },
            { icon: '⚠️', label: 'Risk Scoring', desc: 'OFAC, scam, mixer, ransomware' },
            { icon: '🕸️', label: 'Fund Tracing', desc: 'Follow money across wallets' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-left">
              <div className="text-lg">{item.icon}</div>
              <div className="mt-1 text-xs font-semibold text-gray-200">{item.label}</div>
              <div className="mt-0.5 text-xs text-gray-500">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

