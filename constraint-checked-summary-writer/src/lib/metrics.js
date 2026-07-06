// ---------------------------------------------------------------------------
// Batch metrics (SHOULD): run N generations and measure the loop's value as
// the delta between first-attempt pass rate and final pass rate.
// ---------------------------------------------------------------------------

import { runLoop } from './loop.js'
import { buildRuleset } from '../config/rules.js'
import { getGenerator } from './generator.js'
import { SAMPLES } from './samples.js'

/**
 * Run `count` generations across the sample set (cycled) and aggregate.
 * Returns first-attempt vs final pass rates — the delta is the headline number.
 */
export async function runBatch({ count = 20, profileKey = 'strict', mode = 'mock' } = {}) {
  const generate = getGenerator(mode)
  let firstPass = 0
  let finalPass = 0
  let totalAttempts = 0
  const rows = []

  for (let i = 0; i < count; i++) {
    const sample = SAMPLES[i % SAMPLES.length]
    const ruleset = buildRuleset(profileKey, sample.extras || {})
    const result = await runLoop({
      input: sample.input,
      ruleset,
      generate,
      delayMs: 0, // no animation delay for batch
    })
    const firstOk = result.attempts[0]?.verdict.passed === true
    if (firstOk) firstPass++
    if (result.passed) finalPass++
    totalAttempts += result.attempts.length
    rows.push({
      sample: sample.name,
      firstOk,
      finalOk: result.passed,
      attempts: result.attempts.length,
    })
  }

  return {
    count,
    firstPassRate: firstPass / count,
    finalPassRate: finalPass / count,
    delta: (finalPass - firstPass) / count,
    avgAttempts: totalAttempts / count,
    rows,
  }
}
