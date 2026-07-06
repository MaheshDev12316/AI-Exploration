import React, { useMemo, useState } from 'react'
import InputPane from './components/InputPane.jsx'
import Timeline from './components/Timeline.jsx'
import ResultCard from './components/ResultCard.jsx'
import MetricsPanel from './components/MetricsPanel.jsx'
import RulesPanel from './components/RulesPanel.jsx'
import JudgePanel from './components/JudgePanel.jsx'
import DealPicker from './components/DealPicker.jsx'
import { buildRuleset, MAX_ATTEMPTS } from './config/rules.js'
import { getGenerator, llmAvailable } from './lib/generator.js'
import { getJudge } from './lib/judge.js'
import { runLoop } from './lib/loop.js'
import { DEFAULT_SAMPLE } from './lib/samples.js'

export default function App() {
  const [input, setInput] = useState({ ...DEFAULT_SAMPLE.input })
  const [selectedId, setSelectedId] = useState(DEFAULT_SAMPLE.id)
  const [profileKey, setProfileKey] = useState('strict')
  const [mode, setMode] = useState('mock')
  const [mustMention, setMustMention] = useState('')
  const [attempts, setAttempts] = useState([])
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [judge, setJudge] = useState(null)
  const [judgeLoading, setJudgeLoading] = useState(false)
  const [judgeError, setJudgeError] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sourceLabel, setSourceLabel] = useState('')

  const extras = useMemo(
    () => ({
      mustMention: mustMention
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }),
    [mustMention],
  )
  const ruleset = useMemo(() => buildRuleset(profileKey, extras), [profileKey, extras])

  const setField = (k, v) => setInput((prev) => ({ ...prev, [k]: v }))

  function clearJudge() {
    setJudge(null)
    setJudgeError(null)
    setJudgeLoading(false)
  }

  function onSelectSample(sample) {
    setSelectedId(sample.id)
    setInput({ ...sample.input })
    setMustMention((sample.extras?.mustMention || []).join(', '))
    setSourceLabel('')
    setAttempts([])
    setResult(null)
    clearJudge()
  }

  function onSelectDeal(deal) {
    setSelectedId(null)
    setInput({ raw: '', account: '', amount: '', closeDate: '', ask: '', ...deal.input })
    setSourceLabel(`${deal.name} (Salesforce)`)
    setAttempts([])
    setResult(null)
    clearJudge()
    setPickerOpen(false)
  }

  function onReset() {
    setAttempts([])
    setResult(null)
    clearJudge()
  }

  async function onRun() {
    setRunning(true)
    setAttempts([])
    setResult(null)
    clearJudge()
    const generate = getGenerator(mode)
    try {
      const res = await runLoop({
        input,
        ruleset,
        generate,
        maxAttempts: MAX_ATTEMPTS,
        delayMs: 700,
        onAttempt: (_rec, all) => setAttempts(all),
      })
      setResult(res)
      // Style judge runs ONLY on a verified summary, and never gates it.
      if (res.passed && res.accepted) runJudge(res.accepted.summary)
    } catch (err) {
      setResult({
        passed: false,
        attempts,
        best: { attempt: 0, summary: '', verdict: { passedCount: 0, totalCount: 0, checks: [] } },
        fatal: String(err.message || err),
      })
    } finally {
      setRunning(false)
    }
  }

  async function runJudge(summary) {
    setJudgeLoading(true)
    setJudgeError(null)
    setJudge(null)
    try {
      const doJudge = getJudge(mode)
      // Let the accepted card paint before a (possibly async) judge call.
      await new Promise((r) => setTimeout(r, 30))
      const res = await doJudge({ summary, input })
      setJudge(res)
    } catch (err) {
      setJudgeError(String(err.message || err))
    } finally {
      setJudgeLoading(false)
    }
  }

  const hasRun = attempts.length > 0 || result

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="logo">
            <svg viewBox="0 0 32 32" fill="none">
              <path
                d="M7 16.5l5.5 5.5L25 9"
                stroke="#fff"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1>Constraint-Checked Summary Writer</h1>
            <div className="sub">
              Next Quarter · TS-05 — the LLM drafts, deterministic code verifies, only verified
              output ships.
            </div>
          </div>
        </div>
        <div className="spacer" />
        <div className="header-controls">
          <span className={'chip ' + (mode === 'llm' && llmAvailable ? 'green' : '')}>
            <span className="dot" />
            {mode === 'llm' && llmAvailable ? 'Live LLM' : 'Deterministic drafter'}
          </span>
          <span className="chip">Max {MAX_ATTEMPTS} attempts</span>
        </div>
      </header>

      <div className="grid">
        {/* left: inputs & config */}
        <div>
          <InputPane
            input={input}
            setField={setField}
            selectedId={selectedId}
            onSelectSample={onSelectSample}
            profileKey={profileKey}
            setProfileKey={setProfileKey}
            mode={mode}
            setMode={setMode}
            llmAvailable={llmAvailable}
            mustMention={mustMention}
            setMustMention={setMustMention}
            onRun={onRun}
            onReset={onReset}
            running={running}
            onOpenSalesforce={() => setPickerOpen(true)}
            sourceLabel={sourceLabel}
          />
        </div>

        {/* right: live timeline, result, metrics, rules */}
        <div className="stack">
          <div className="panel">
            <div className="pad">
              <h2>Attempt timeline</h2>
              {!hasRun ? (
                <div className="empty">
                  <div className="big">No attempts yet</div>
                  Pick a sample (or edit the fields) and run the loop. Each attempt shows its
                  generated draft, the per-check verification report, and the targeted
                  corrections fed into the next attempt.
                </div>
              ) : (
                <Timeline attempts={attempts} />
              )}
            </div>
          </div>

          {result && <ResultCard result={result} />}

          {result?.passed && (
            <JudgePanel judge={judge} loading={judgeLoading} error={judgeError} mode={mode} />
          )}

          <MetricsPanel profileKey={profileKey} mode={mode} />
          <RulesPanel ruleset={ruleset} />
        </div>
      </div>

      <DealPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onSelectDeal}
      />

      <div className="footer">
        Verifiers are deterministic, unit-tested code — never LLM self-assessment. &nbsp;·&nbsp;
        Config in <code>src/config/rules.js</code> &nbsp;·&nbsp; Tests:{' '}
        <code>npm test</code>
      </div>
    </div>
  )
}
