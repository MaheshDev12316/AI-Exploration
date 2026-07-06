import React from 'react'
import { SAMPLES } from '../lib/samples.js'
import { PROFILES } from '../config/rules.js'

export default function InputPane({
  input,
  setField,
  selectedId,
  onSelectSample,
  profileKey,
  setProfileKey,
  mode,
  setMode,
  llmAvailable,
  mustMention,
  setMustMention,
  onRun,
  onReset,
  running,
  onOpenSalesforce,
  sourceLabel,
}) {
  return (
    <div className="stack">
      <div className="panel">
        <div className="pad">
          <div className="sf-cta">
            <button className="btn btn-sf" onClick={onOpenSalesforce} disabled={running}>
              <span className="sf-cloud">☁</span> Pull a deal from Salesforce
            </button>
            {sourceLabel && <div className="sf-loaded">Loaded: {sourceLabel}</div>}
          </div>
          <div className="divider" style={{ margin: '14px 0' }} />
          <h2>Sample deal updates</h2>
          <div className="samples">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                className={'sample' + (selectedId === s.id ? ' active' : '')}
                onClick={() => onSelectSample(s)}
                disabled={running}
              >
                <div className="s-name">{s.name}</div>
                <div className="s-tag">{s.tag}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="pad">
          <h2>Deal update &amp; key fields</h2>

          <div className="field">
            <label>Raw deal update (source)</label>
            <textarea
              value={input.raw}
              onChange={(e) => setField('raw', e.target.value)}
              placeholder="Paste the rep's status update…"
            />
          </div>

          <div className="row-2">
            <div className="field">
              <label>Account</label>
              <input
                type="text"
                value={input.account}
                onChange={(e) => setField('account', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Amount</label>
              <input
                type="text"
                value={input.amount}
                onChange={(e) => setField('amount', e.target.value)}
                placeholder="$1.37M"
              />
            </div>
          </div>

          <div className="row-2">
            <div className="field">
              <label>Close date</label>
              <input
                type="date"
                value={input.closeDate}
                onChange={(e) => setField('closeDate', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Extra constraint (optional)</label>
              <input
                type="text"
                value={mustMention}
                onChange={(e) => setMustMention(e.target.value)}
                placeholder="must mention: Globex"
              />
              <span className="hint">Comma-separated. Adds a "must mention" check.</span>
            </div>
          </div>

          <div className="field">
            <label>The ask</label>
            <input
              type="text"
              value={input.ask}
              onChange={(e) => setField('ask', e.target.value)}
              placeholder="need a VP on Thursday's call"
            />
          </div>

          <div className="divider" />

          <div className="field">
            <label>Constraint profile</label>
            <div className="seg" role="tablist">
              {Object.keys(PROFILES).map((k) => (
                <button
                  key={k}
                  className={profileKey === k ? 'active' : ''}
                  onClick={() => setProfileKey(k)}
                  disabled={running}
                >
                  {PROFILES[k].label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Drafter</label>
            <div className="seg">
              <button
                className={mode === 'mock' ? 'active' : ''}
                onClick={() => setMode('mock')}
                disabled={running}
              >
                Deterministic (offline)
              </button>
              <button
                className={mode === 'llm' ? 'active' : ''}
                onClick={() => setMode('llm')}
                disabled={running || !llmAvailable}
                title={llmAvailable ? '' : 'Set VITE_ANTHROPIC_API_KEY to enable'}
              >
                Live LLM {llmAvailable ? '' : '(no key)'}
              </button>
            </div>
          </div>

          <div className="btn-row" style={{ marginTop: 6 }}>
            <button className="btn btn-primary" onClick={onRun} disabled={running}>
              {running ? (
                <>
                  <span className="spinner" /> &nbsp;Running loop…
                </>
              ) : (
                'Generate → Verify → Retry'
              )}
            </button>
          </div>
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onReset} disabled={running}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
