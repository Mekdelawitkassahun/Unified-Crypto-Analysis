/**
 * Transaction Table — standalone ledger view.
 *
 * Features:
 *  - Full-width paginated table (20 rows/page)
 *  - Search by address or tx hash
 *  - Filter by value tier
 *  - "Investigate →" button on each row → opens graph page for that address
 */
import { useState } from 'react';
import Loader from '../components/common/Loader';

const PAGE_SIZE = 20;
const HIGH_VALUE_THRESHOLD = Number(import.meta.env.VITE_HIGH_VALUE_THRESHOLD_ETH || 10);

const th = {
  textAlign: 'left', padding: '11px 16px',
  borderBottom: '2px solid rgba(201,168,76,0.22)',
  color: '#8f9bad', fontSize: '11px', fontWeight: '600',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  background: 'rgba(18,28,44,0.95)',
};
const td = {
  padding: '10px 16px', borderBottom: '1px solid rgba(201,168,76,0.08)',
  fontSize: '12px', color: '#c7d0db', fontFamily: 'monospace',
};

const riskColor = (label) => {
  if (label === 'High')   return { color: '#f87171', background: 'rgba(185,28,28,0.15)', border: '1px solid rgba(185,28,28,0.3)' };
  if (label === 'Medium') return { color: '#fbbf24', background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)' };
  return { color: '#4ade80', background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)' };
};

const scoreFromAmount = (amount) => {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || HIGH_VALUE_THRESHOLD <= 0) return 0;

  const ratio = value / HIGH_VALUE_THRESHOLD;
  if (ratio >= 2) return 100;
  if (ratio >= 1) return Math.round((75 + 25 * (ratio - 1)) * 10) / 10;
  return Math.round(Math.min(75, 75 * ratio) * 10) / 10;
};

const labelFromAmount = (amount) => {
  const score = scoreFromAmount(amount);
  if (score > 75) return 'High';
  if (score > 40) return 'Medium';
  return 'Low';
};

const navBtn = (disabled) => ({
  padding: '7px 18px',
  background: disabled ? 'rgba(15,24,38,0.5)' : 'rgba(13,27,46,0.95)',
  color: disabled ? 'rgba(201,168,76,0.25)' : '#c9a84c',
  border: '1px solid ' + (disabled ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.3)'),
  borderRadius: '7px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '12px', fontWeight: '600',
});

const RISK_FILTERS = ['All', 'High', 'Medium', 'Low'];

export default function Dashboard({
  transactions,
  loading,
  loadingMore,
  error,
  onInvestigate,
  onLoadMore,
  lastUpdated,
  totalTransactions = 0,
}) {
  const [page, setPage]         = useState(0);
  const [search, setSearch]     = useState('');
  const [riskFilter, setRisk]   = useState('All');

  if (loading) return <Loader />;
  if (error)   return <div style={{ color: '#ef4444', padding: '1.5rem' }}>Error: {error}</div>;

  // Filter by amount-based risk label only
  const filtered = transactions.filter(tx => {
    const derived = labelFromAmount(tx.amount);
    const matchRisk   = riskFilter === 'All' || derived === riskFilter;
    const q           = search.toLowerCase();
    const matchSearch = !q || tx.hash?.toLowerCase().includes(q)
      || tx.sender?.toLowerCase().includes(q)
      || tx.receiver?.toLowerCase().includes(q);
    return matchRisk && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages - 1);
  const pageTxs    = filtered.slice(visiblePage * PAGE_SIZE, (visiblePage + 1) * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#edf2f8' }}>Transaction Ledger</div>
          <div style={{ fontSize: '12px', color: '#6b7a8d', marginTop: '2px' }}>
            Loaded {transactions.length.toLocaleString()} of {totalTransactions.toLocaleString() || transactions.length.toLocaleString()} transactions
            {' · ordered by highest ETH amount'}
            {filtered.length !== transactions.length && ` · ${filtered.length.toLocaleString()} visible`}
            {riskFilter !== 'All' && ` · filtered by ${riskFilter} tier`}
            {search && ` · matching "${search}"`}
          </div>
        </div>
        {lastUpdated && (
          <span style={{ fontSize: '11px', color: '#4a5568' }}>
            Updated {lastUpdated.toLocaleTimeString()} · auto-refreshes every 30 min
          </span>
        )}
      </div>

      {/* ── Toolbar: search + risk filter ── */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by address or tx hash..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(0);
          }}
          style={{
            flex: 1, minWidth: '240px', padding: '8px 12px',
            border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px',
            fontSize: '13px', outline: 'none', background: 'rgba(15,24,38,0.9)', color: '#edf2f8',
          }}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          {RISK_FILTERS.map(f => (
            <button key={f} onClick={() => {
              setRisk(f);
              setPage(0);
            }} style={{
              padding: '7px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer',
              background: riskFilter === f ? 'rgba(13,27,46,0.95)' : 'rgba(22,33,52,0.9)',
              color: riskFilter === f ? '#c9a84c' : '#8f9bad',
              border: '1px solid ' + (riskFilter === f ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.2)'),
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'rgba(22,33,52,0.95)', borderRadius: '12px', border: '1px solid rgba(201,168,76,0.18)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: '16%' }}>Tx Hash</th>
              <th style={{ ...th, width: '22%' }}>From (Sender)</th>
              <th style={{ ...th, width: '22%' }}>To (Receiver)</th>
              <th style={{ ...th, width: '11%' }}>Amount</th>
              <th style={{ ...th, width: '15%' }}>Timestamp</th>
              <th style={{ ...th, width: '9%' }}>Risk</th>
              <th style={{ ...th, width: '5%' }}></th>
            </tr>
          </thead>
          <tbody>
            {pageTxs.length === 0
              ? <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#4a5568', padding: '48px' }}>
                  No transactions match your filters.
                </td></tr>
              : pageTxs.map(tx => {
                const score = scoreFromAmount(tx.amount);
                const label = labelFromAmount(tx.amount);
                const rc    = riskColor(label);
                return (
                  <tr key={tx.hash}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ ...td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer"
                        style={{ color: '#3b82f6', textDecoration: 'none' }} title={tx.hash}>
                        {tx.hash ? `${tx.hash.slice(0, 8)}...${tx.hash.slice(-6)}` : '—'}
                      </a>
                    </td>
                    <td style={{ ...td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={tx.sender}>
                      <span
                        onClick={() => onInvestigate(tx.sender)}
                        style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}>
                        {tx.sender}
                      </span>
                    </td>
                    <td style={{ ...td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={tx.receiver}>
                      <span
                        onClick={() => onInvestigate(tx.receiver)}
                        style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}>
                        {tx.receiver}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#16a34a', fontWeight: '600' }}>{tx.amount} ETH</td>
                    <td style={{ ...td, fontSize: '11px' }}>{tx.timestamp}</td>
                    <td style={td}>
                      <span style={{
                        ...rc, padding: '3px 8px', borderRadius: '999px',
                        fontSize: '11px', fontWeight: '700', fontFamily: 'sans-serif',
                      }}>
                        {score} {label}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <button
                        onClick={() => onInvestigate(tx.sender)}
                        title={`Investigate ${tx.sender} in graph`}
                        style={{
                          padding: '4px 10px', background: 'rgba(2,132,199,0.15)', color: '#38bdf8',
                          border: '1px solid rgba(2,132,199,0.3)', borderRadius: '6px',
                          cursor: 'pointer', fontSize: '11px', fontWeight: '600',
                          whiteSpace: 'nowrap',
                        }}>
                        🔍
                      </button>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={navBtn(visiblePage === 0)} disabled={visiblePage === 0} onClick={() => setPage(p => p - 1)}>
          ← Back
        </button>
        <span style={{ fontSize: '13px', color: '#6b7a8d' }}>
          Page <strong>{visiblePage + 1}</strong> of <strong>{totalPages}</strong>
          <span style={{ marginLeft: '10px', color: '#4a5568', fontSize: '12px' }}>
            ({visiblePage * PAGE_SIZE + 1}–{Math.min((visiblePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length})
          </span>
        </span>
        <button style={navBtn(visiblePage >= totalPages - 1)} disabled={visiblePage >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
          Next →
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onLoadMore}
          disabled={loadingMore || transactions.length >= totalTransactions}
          style={{
            padding: '9px 18px',
            background: loadingMore || transactions.length >= totalTransactions ? 'rgba(15,24,38,0.5)' : 'rgba(13,27,46,0.95)',
            color: loadingMore || transactions.length >= totalTransactions ? 'rgba(201,168,76,0.25)' : '#c9a84c',
            border: '1px solid ' + (loadingMore || transactions.length >= totalTransactions ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.3)'),
            borderRadius: '8px',
            cursor: loadingMore || transactions.length >= totalTransactions ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          {transactions.length >= totalTransactions
            ? 'All transactions loaded'
            : loadingMore
              ? 'Loading more...'
              : 'Load More From Database'}
        </button>
      </div>

    </div>
  );
}
