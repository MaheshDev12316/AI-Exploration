// ---------------------------------------------------------------------------
// The generate → verify → retry loop.
// ---------------------------------------------------------------------------
// Orchestration only. It knows nothing about HOW a draft is produced (that is
// the generator) or HOW it is judged (that is the verifier) — it just wires
// them together, feeds each failure's targeted corrections into the next
// attempt, and stops on the first pass or after MAX_ATTEMPTS.
//
// Every attempt (draft, verdict, and the prompt that produced it) is recorded,
// so the UI timeline and the honest-failure card can show real history.
// ---------------------------------------------------------------------------

import { verifySummary } from './verifiers.js'
import { MAX_ATTEMPTS } from '../config/rules.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * @param {object}   opts
 * @param {object}   opts.input      structured deal fields (+ raw update)
 * @param {object}   opts.ruleset    effective constraints (from buildRuleset)
 * @param {Function} opts.generate   drafter (mock or llm)
 * @param {number}   [opts.maxAttempts]
 * @param {number}   [opts.delayMs]  pause between attempts (timeline animation)
 * @param {Function} [opts.onAttempt] called with each attempt as it completes
 * @returns {Promise<{attempts, passed, accepted, best, exhausted}>}
 */
export async function runLoop({
  input,
  ruleset,
  generate,
  maxAttempts = MAX_ATTEMPTS,
  delayMs = 650,
  onAttempt,
}) {
  const attempts = []
  const resolved = new Set() // shared memory the mock drafter uses to improve
  let feedback = []
  let best = null

  for (let n = 1; n <= maxAttempts; n++) {
    let record
    try {
      const { summary, prompt } = await generate({
        input,
        ruleset,
        attempt: n,
        feedback,
        resolved,
      })
      const verdict = verifySummary(summary, input, ruleset)
      record = { attempt: n, summary, prompt, verdict, error: null }
    } catch (err) {
      // Honest handling: a generator failure is recorded, not hidden.
      record = {
        attempt: n,
        summary: '',
        prompt: '',
        verdict: { passed: false, checks: [], passedCount: 0, totalCount: 0, feedback: [] },
        error: String(err.message || err),
      }
    }

    attempts.push(record)
    if (!best || record.verdict.passedCount > best.verdict.passedCount) best = record
    if (onAttempt) onAttempt(record, attempts.slice())

    if (record.verdict.passed) {
      return { attempts, passed: true, accepted: record, best: record, exhausted: false }
    }

    feedback = record.verdict.feedback
    if (n < maxAttempts && delayMs) await sleep(delayMs)
  }

  // Attempts exhausted — report honest failure with the best attempt.
  return { attempts, passed: false, accepted: null, best, exhausted: true }
}
