import React from 'react'

function Stars({ score }) {
  const full = Math.round(score)
  return (
    <span className="stars" aria-label={`${score} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={'star' + (i <= full ? ' on' : '')}>
          ★
        </span>
      ))}
    </span>
  )
}

export default function JudgePanel({ judge, loading, error, mode }) {
  return (
    <div className="panel judge">
      <div className="pad">
        <div className="judge-head">
          <h2 style={{ margin: 0 }}>LLM Style Judge</h2>
          <span className="chip amber">advisory · not the gate</span>
        </div>
        <p className="note judge-disclaimer">
          Scores the <b>style</b> of the already-verified summary. It is kept deliberately
          separate from the formal gate and <b>does not affect pass/fail</b> — deterministic
          verifiers alone decide that.
        </p>

        {loading && (
          <div className="judge-loading">
            <span className="spinner" /> &nbsp;Scoring style…
          </div>
        )}

        {error && (
          <div className="feedback">
            <span className="lbl">Judge unavailable</span>
            <ul>
              <li>{error}</li>
            </ul>
          </div>
        )}

        {judge && !loading && (
          <>
            <div className="judge-overall">
              <div className="judge-score">{judge.overall.toFixed(1)}</div>
              <div>
                <Stars score={judge.overall} />
                <div className="judge-verdict">{judge.verdict}</div>
                <div className="judge-source">
                  Source:{' '}
                  {judge.source === 'llm' ? 'Claude (live)' : 'deterministic heuristic (offline)'}
                </div>
              </div>
            </div>

            <div className="judge-dims">
              {judge.dimensions.map((d) => (
                <div key={d.name} className="judge-dim">
                  <div className="jd-top">
                    <span className="jd-name">{d.name}</span>
                    <span className="jd-score">{d.score}/5</span>
                  </div>
                  <div className="bar">
                    <span style={{ width: `${(d.score / 5) * 100}%` }} />
                  </div>
                  <div className="jd-note">{d.note}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
