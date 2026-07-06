import React, { useState } from 'react'
import { runBatch } from '../lib/metrics.js'

const pct = (x) => `${Math.round(x * 100)}%`

export default function MetricsPanel({ profileKey, mode }) {
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState(null)

  async function run() {
    setBusy(true)
    // Yield to the browser so the spinner paints before the (sync) batch runs.
    await new Promise((r) => setTimeout(r, 30))
    const res = await runBatch({ count: 20, profileKey, mode })
    setData(res)
    setBusy(false)
  }

  return (
    <div className="panel">
      <div className="pad">
        <h2>Batch metrics — the loop's measured value</h2>
        <p className="note" style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 0 }}>
          Runs 20 generations across the samples and reports first-attempt vs. final pass
          rate. The delta is what the retry loop earns.
        </p>
        <button className="btn" onClick={run} disabled={busy}>
          {busy ? (
            <>
              <span className="spinner" /> &nbsp;Running 20…
            </>
          ) : (
            'Run 20 generations'
          )}
        </button>

        {data && (
          <>
            <div className="metric-grid" style={{ marginTop: 14 }}>
              <div className="metric">
                <div className="m-val">{pct(data.firstPassRate)}</div>
                <div className="m-lab">First-attempt pass rate</div>
                <div className="bar">
                  <span style={{ width: pct(data.firstPassRate) }} />
                </div>
              </div>
              <div className="metric">
                <div className="m-val">{pct(data.finalPassRate)}</div>
                <div className="m-lab">Final pass rate</div>
                <div className="bar">
                  <span style={{ width: pct(data.finalPassRate) }} />
                </div>
              </div>
              <div className="metric delta">
                <div className="m-val">+{Math.round(data.delta * 100)}pts</div>
                <div className="m-lab">Delta · avg {data.avgAttempts.toFixed(1)} attempts</div>
              </div>
            </div>
            <p className="note" style={{ color: 'var(--muted)', fontSize: 12 }}>
              Final pass rate stays below 100% because one sample (a vague close date) is
              genuinely unverifiable — the loop honestly cannot fix it.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
