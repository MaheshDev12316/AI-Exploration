import React from 'react'

export default function ResultCard({ result }) {
  if (!result) return null
  const { passed, accepted, best, attempts } = result

  if (passed) {
    return (
      <div className="result accepted">
        <div className="result-head">
          <span className="result-badge">✓ All checks passed</span>
        </div>
        <h3>Accepted executive summary</h3>
        <div className="final-summary" style={{ marginTop: 12 }}>
          {accepted.summary}
        </div>
        <div className="meta-row">
          <span>
            Accepted on attempt <b>{accepted.attempt}</b> of {attempts.length}
          </span>
          <span>
            Checks: <b>{accepted.verdict.passedCount}/{accepted.verdict.totalCount}</b>
          </span>
          <span>
            Verifier: <b>deterministic code</b> (not model self-assessment)
          </span>
        </div>
      </div>
    )
  }

  // Honest failure
  return (
    <div className="result failed">
      <div className="result-head">
        <span className="result-badge">⚠ Could not produce a verified summary</span>
      </div>
      <h3>Honest failure after {attempts.length} attempts</h3>
      <p className="note">
        The loop exhausted its retry budget without passing every deterministic check.
        Rather than ship an unverified summary, it reports failure and surfaces the best
        attempt below — with the checks it still could not satisfy.
      </p>
      <div className="final-summary" style={{ marginTop: 12 }}>
        {best.summary || '(no draft produced)'}
      </div>
      <div className="meta-row">
        <span>
          Best attempt: <b>#{best.attempt}</b>
        </span>
        <span>
          Passed <b>{best.verdict.passedCount}/{best.verdict.totalCount}</b> checks
        </span>
      </div>
      <div style={{ marginTop: 12 }} className="report">
        {best.verdict.checks
          .filter((c) => !c.passed)
          .map((c) => (
            <div key={c.id} className="check fail">
              <span className="ic">✕</span>
              <div className="c-body">
                <div className="c-label">{c.label}</div>
                <div className="c-detail">{c.detail}</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
