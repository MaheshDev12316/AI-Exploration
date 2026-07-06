import React, { useState } from 'react'

function VerificationReport({ checks }) {
  return (
    <div className="report">
      <span className="lbl">Verification report</span>
      {checks.map((c) => (
        <div key={c.id} className={'check ' + (c.passed ? 'pass' : 'fail')}>
          <span className="ic">{c.passed ? '✓' : '✕'}</span>
          <div className="c-body">
            <div className="c-label">{c.label}</div>
            <div className="c-detail">{c.detail}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AttemptCard({ record, isLast }) {
  const [showPrompt, setShowPrompt] = useState(false)
  const { attempt, summary, verdict, prompt, error } = record
  const passed = verdict.passed

  return (
    <div className={'attempt ' + (passed ? 'pass' : 'fail')}>
      <div className="attempt-head">
        <div className="attempt-num">{attempt}</div>
        <div className="attempt-title">
          Attempt {attempt}{' '}
          <span className="muted">
            · {verdict.passedCount}/{verdict.totalCount} checks passed
          </span>
        </div>
        <div className="spacer" />
        <span className={'chip ' + (passed ? 'green' : 'red')}>
          <span className="dot" />
          {passed ? 'Verified' : 'Rejected'}
        </span>
      </div>

      <div className="attempt-body">
        {error ? (
          <div className="feedback">
            <span className="lbl">Generator error</span>
            <ul>
              <li>{error}</li>
            </ul>
          </div>
        ) : (
          <>
            <div className="summary-box">
              <span className="lbl">Generated draft</span>
              {summary}
            </div>

            <VerificationReport checks={verdict.checks} />

            {!passed && verdict.feedback.length > 0 && (
              <div className="feedback">
                <span className="lbl">
                  Targeted corrections → fed into attempt {attempt + 1}
                </span>
                <ul>
                  {verdict.feedback.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {prompt && (
          <div>
            <button className="prompt-toggle" onClick={() => setShowPrompt((v) => !v)}>
              {showPrompt ? '▾ Hide' : '▸ Show'} recorded prompt for this attempt
            </button>
            {showPrompt && (
              <div className="prompt-box" style={{ marginTop: 8 }}>
                <pre>{prompt}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Timeline({ attempts }) {
  return (
    <div className="timeline">
      {attempts.map((rec, i) => (
        <AttemptCard key={rec.attempt} record={rec} isLast={i === attempts.length - 1} />
      ))}
    </div>
  )
}
