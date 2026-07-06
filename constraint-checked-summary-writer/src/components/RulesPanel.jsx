import React from 'react'

export default function RulesPanel({ ruleset }) {
  return (
    <div className="panel">
      <div className="pad">
        <h2>Active constraints ({ruleset.label})</h2>
        <div className="rule-list">
          <div className="rule">
            <span className="r-k">Max words</span>
            <span className="r-v">{ruleset.maxWords}</span>
          </div>
          <div className="rule">
            <span className="r-k">Max words / sentence</span>
            <span className="r-v">{ruleset.maxSentenceWords}</span>
          </div>
          <div className="rule">
            <span className="r-k">Amount tolerance</span>
            <span className="r-v">
              {ruleset.amountToleranceDollars === 0
                ? 'exact'
                : `±$${ruleset.amountToleranceDollars.toLocaleString()}`}
            </span>
          </div>
          <div className="rule">
            <span className="r-k">Date tolerance</span>
            <span className="r-v">
              {ruleset.dateToleranceDays === 0 ? 'exact' : `±${ruleset.dateToleranceDays}d`}
            </span>
          </div>
          <div className="rule">
            <span className="r-k">Ask coverage required</span>
            <span className="r-v">{Math.round(ruleset.askCoverage * 100)}%</span>
          </div>
          <div className="rule">
            <span className="r-k">Banned phrases</span>
            <span className="r-v">
              {ruleset.enforceBannedPhrases ? `${ruleset.bannedPhrases.length} enforced` : 'off'}
            </span>
          </div>
        </div>
        {ruleset.enforceBannedPhrases && (
          <div className="banned-tags">
            {ruleset.bannedPhrases.slice(0, 12).map((p) => (
              <span key={p}>{p}</span>
            ))}
            {ruleset.bannedPhrases.length > 12 && (
              <span>+{ruleset.bannedPhrases.length - 12} more</span>
            )}
          </div>
        )}
        <p className="note" style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 12 }}>
          Edit <code style={{ fontFamily: 'var(--mono)' }}>src/config/rules.js</code> to change
          these without touching verifier code.
        </p>
      </div>
    </div>
  )
}
