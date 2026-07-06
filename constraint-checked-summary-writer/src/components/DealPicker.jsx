import React, { useEffect, useRef, useState, useCallback } from 'react'
import { fetchHealth, fetchDeals } from '../lib/dealsApi.js'

const VIEW_LABELS = {
  executive: 'Executive priority',
  account: 'By account',
  mypipeline: 'My pipeline',
  recent: 'Recently updated',
}
const TIMEFRAME_LABELS = {
  this_quarter: 'This quarter',
  next_quarter: 'Next quarter',
  next_90: 'Next 90 days',
  this_year: 'This year',
  any: 'Any date',
}
const PAGE = 25

export default function DealPicker({ open, onClose, onSelect }) {
  const [health, setHealth] = useState(null)
  const [healthErr, setHealthErr] = useState(null)
  const [view, setView] = useState('executive')
  const [timeframe, setTimeframe] = useState('this_quarter')
  const [account, setAccount] = useState('')
  const [stage, setStage] = useState('')
  const [search, setSearch] = useState('')
  const [deals, setDeals] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const debounce = useRef(null)

  // Probe the connector once when opened.
  useEffect(() => {
    if (!open) return
    setHealth(null)
    setHealthErr(null)
    fetchHealth()
      .then(setHealth)
      .catch((e) => setHealthErr(e.message))
  }, [open])

  const load = useCallback(
    async (offset = 0) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchDeals({ view, timeframe, account, stage, search, limit: PAGE, offset })
        setTotal(res.total)
        setDeals((prev) => (offset === 0 ? res.deals : [...prev, ...res.deals]))
      } catch (e) {
        setError(e.message)
        if (offset === 0) setDeals([])
      } finally {
        setLoading(false)
      }
    },
    [view, timeframe, account, stage, search],
  )

  // Re-query (debounced) whenever a filter changes and the connector is reachable.
  useEffect(() => {
    if (!open || (!health && !healthErr)) return
    if (healthErr) return
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => load(0), 250)
    return () => clearTimeout(debounce.current)
  }, [open, health, healthErr, load])

  if (!open) return null

  const modeChip = health ? (
    <span className={'chip ' + (health.mode === 'live' ? 'green' : 'amber')}>
      <span className="dot" />
      {health.mode === 'live' ? `Live · ${health.identity?.user || 'org'}` : 'Mock data'}
    </span>
  ) : null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2 style={{ margin: 0 }}>Pull a deal from Salesforce</h2>
            <div className="modal-sub">
              Opportunities are scoped server-side (SOQL) — never all {total ? `of ~${total}+` : ''}{' '}
              at once.
            </div>
          </div>
          {modeChip}
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {health?.mode === 'mock' && (
          <div className="modal-banner">
            Showing <b>fictional</b> Salesforce-shaped data. Set your Dev-org credentials in{' '}
            <code>server/.env</code> to query a live org.
          </div>
        )}

        {healthErr ? (
          <div className="feedback" style={{ margin: 16 }}>
            <span className="lbl">Connector unavailable</span>
            <ul>
              <li>{healthErr}</li>
              <li>
                Start it: <code>cd server &amp;&amp; npm install &amp;&amp; npm start</code>
              </li>
            </ul>
          </div>
        ) : (
          <>
            <div className="picker-controls">
              <div className="seg">
                {Object.keys(VIEW_LABELS).map((k) => (
                  <button
                    key={k}
                    className={view === k ? 'active' : ''}
                    onClick={() => setView(k)}
                  >
                    {VIEW_LABELS[k]}
                  </button>
                ))}
              </div>
              <div className="picker-filters">
                {view === 'executive' && (
                  <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                    {Object.keys(TIMEFRAME_LABELS).map((k) => (
                      <option key={k} value={k}>
                        {TIMEFRAME_LABELS[k]}
                      </option>
                    ))}
                  </select>
                )}
                {view === 'account' && (
                  <input
                    type="text"
                    placeholder="Account name contains…"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                  />
                )}
                <select value={stage} onChange={(e) => setStage(e.target.value)}>
                  <option value="">All stages</option>
                  {(health?.stages || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Search name or account…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="deal-list">
              {error && (
                <div className="feedback" style={{ margin: 0 }}>
                  <span className="lbl">Query error</span>
                  <ul>
                    <li>{error}</li>
                  </ul>
                </div>
              )}
              {!error && deals.length === 0 && !loading && (
                <div className="empty" style={{ margin: 0 }}>
                  <div className="big">No matching deals</div>
                  Try a different view, widen the timeframe, or clear filters.
                </div>
              )}
              {deals.map((d) => (
                <button key={d.id} className="deal-row" onClick={() => onSelect(d)}>
                  <div className="deal-main">
                    <div className="deal-name">{d.name}</div>
                    <div className="deal-meta">
                      {d.account} · {d.stage}
                      {d.probability != null ? ` · ${d.probability}%` : ''} · {d.owner}
                    </div>
                  </div>
                  <div className="deal-right">
                    <div className="deal-amount">{d.amount || '—'}</div>
                    <div className="deal-date">{d.closeDate || 'no date'}</div>
                  </div>
                </button>
              ))}
              {loading && (
                <div className="deal-loading">
                  <span className="spinner" /> &nbsp;Loading…
                </div>
              )}
            </div>

            <div className="picker-foot">
              <span>
                Showing <b>{deals.length}</b>
                {total ? ` of ${total}` : ''}
              </span>
              {deals.length < total && (
                <button className="btn" disabled={loading} onClick={() => load(deals.length)}>
                  Load more
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
