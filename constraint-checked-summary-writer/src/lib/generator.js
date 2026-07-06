// ---------------------------------------------------------------------------
// Generators — the "draft" side of the generate → verify → retry loop.
// ---------------------------------------------------------------------------
// Two implementations share one contract:
//
//   generate({ input, ruleset, attempt, feedback, resolved }) =>
//       Promise<{ summary, prompt }>
//
//   • prompt   — the exact instruction handed to the drafter this attempt,
//                including the targeted corrections from the previous verdict.
//                Recorded so the UI can show that feedback is real (SHOULD).
//   • summary  — the draft to be verified.
//
// `mockGenerate` is a deterministic, offline drafter so the whole flow is
// clickable with zero credentials. `llmGenerate` calls the Anthropic API when
// VITE_ANTHROPIC_API_KEY is set. Either way, the VERIFIER — never the model —
// decides pass/fail.
// ---------------------------------------------------------------------------

import { parseMoney } from './verifiers.js'

// ---- shared prompt construction ------------------------------------------

export function buildPrompt({ input, ruleset, attempt, feedback }) {
  const rules = [
    `- Maximum ${ruleset.maxWords} words total.`,
    `- No sentence longer than ${ruleset.maxSentenceWords} words.`,
    `- State the account name exactly: "${input.account}".`,
    `- State the amount EXACTLY as "${input.amount}" — never round it.`,
    `- State the close date exactly: "${input.closeDate}".`,
    `- Include the explicit ask: "${input.ask}".`,
    ruleset.enforceBannedPhrases
      ? `- Do not use corporate filler or any banned phrase (e.g. ${ruleset.bannedPhrases.slice(0, 4).join(', ')}…).`
      : `- Keep it plain; filler is discouraged.`,
    ...(ruleset.mustMention?.length ? [`- Must mention: ${ruleset.mustMention.join(', ')}.`] : []),
  ].join('\n')

  let prompt =
    `SYSTEM: You write executive deal-update summaries. Facts must be exact.\n\n` +
    `RULES:\n${rules}\n\n` +
    `DEAL UPDATE (source):\n${input.raw || '(none provided)'}\n\n` +
    `KEY FIELDS:\n` +
    `  account: ${input.account}\n  amount: ${input.amount}\n` +
    `  closeDate: ${input.closeDate}\n  ask: ${input.ask}\n\n` +
    `TASK: Write the executive summary now.`

  if (attempt > 1 && feedback?.length) {
    prompt +=
      `\n\n--- CORRECTION (attempt ${attempt}) ---\n` +
      `Your previous draft FAILED deterministic verification. Fix EXACTLY these ` +
      `and change nothing else:\n` +
      feedback.map((f, i) => `  ${i + 1}. ${f}`).join('\n')
  }
  return prompt
}

// ---- category detection (to drive the deterministic drafter) --------------

const CATEGORY_MATCHERS = [
  ['amount', /amount|figure/i],
  ['date', /close date/i],
  ['account', /account name/i],
  ['must-mention', /must mention/i],
  ['banned', /banned phrase/i],
  ['length', /too long|^sentence \d|Sentence \d/i],
  ['ask', /\bask\b/i],
]

function categoriesFrom(feedback = []) {
  const set = new Set()
  for (const f of feedback) {
    for (const [cat, re] of CATEGORY_MATCHERS) if (re.test(f)) set.add(cat)
  }
  return set
}

// ---- deterministic offline drafter ----------------------------------------

/** Round a money string to the nearest $0.1M (the classic fidelity failure). */
function roundMoney(amountStr) {
  const v = parseMoney(amountStr)
  if (v == null) return amountStr
  const rounded = Math.round(v / 100_000) * 100_000
  if (rounded === v) return amountStr // nothing to round; keep exact
  return `$${(rounded / 1e6).toFixed(1)}M`
}

/**
 * Compose a summary honouring the set of `resolved` defect categories.
 * Anything not yet resolved is left flawed, so the verifier has something to
 * catch — modelling an LLM that only fixes what it's explicitly told to.
 */
function compose(resolved, input, ruleset) {
  const clean = resolved.has('banned') || resolved.has('length')
  const amount = resolved.has('amount') ? input.amount : roundMoney(input.amount)
  const withAsk = resolved.has('ask')
  const mentions =
    ruleset.mustMention?.length && resolved.has('must-mention')
      ? ` We remain ahead of ${ruleset.mustMention.join(' and ')}.`
      : ''

  if (!clean) {
    // Attempt-1 style: fluffy, banned phrases, rounded amount, one long sentence, no ask.
    return (
      `As we continue to circle back on the ${input.account} opportunity, the team feels ` +
      `there is strong synergy and we are confident this best-in-class engagement will move ` +
      `the needle going forward, with the deal currently valued at roughly ${amount} and a ` +
      `close targeted around ${input.closeDate} as we streamline the remaining steps.`
    )
  }

  // Cleaned up: plain, exact facts. The ask is added only once flagged.
  const askSentence = withAsk
    ? ` We need ${softenAsk(input.ask)} to keep the deal on track.`
    : ` The team is confident in a strong close this quarter.`

  return (
    `${input.account} is progressing well and is valued at ${amount}, ` +
    `with a close date of ${input.closeDate}.${mentions}${askSentence}`
  )
}

function softenAsk(ask) {
  const a = String(ask).trim().replace(/\.$/, '')
  return /^(need|want|require|please|ask)/i.test(a) ? a.replace(/^need\s+/i, '') : a
}

/**
 * Deterministic drafter. The loop threads a `resolved` Set forward; each round
 * we adopt up to two newly-flagged corrections (priority: facts → style → ask),
 * which reliably produces a couple of honest failures before a pass.
 */
export async function mockGenerate({ input, ruleset, attempt, feedback, resolved }) {
  const PRIORITY = ['amount', 'date', 'account', 'must-mention', 'banned', 'length', 'ask']
  if (attempt > 1) {
    const flagged = categoriesFrom(feedback)
    const pending = PRIORITY.filter((c) => flagged.has(c) && !resolved.has(c))
    for (const c of pending.slice(0, 2)) resolved.add(c)
  }
  const summary = compose(resolved, input, ruleset)
  return { summary, prompt: buildPrompt({ input, ruleset, attempt, feedback }) }
}

// ---- real Anthropic drafter (optional) ------------------------------------

const API_KEY = import.meta?.env?.VITE_ANTHROPIC_API_KEY
const MODEL = import.meta?.env?.VITE_ANTHROPIC_MODEL || 'claude-sonnet-5'

export const llmAvailable = Boolean(API_KEY)

export async function llmGenerate({ input, ruleset, attempt, feedback }) {
  const prompt = buildPrompt({ input, ruleset, attempt, feedback })
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      // Required to call the API directly from a browser during local dev.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system:
        'You write terse executive deal-update summaries. Return ONLY the summary text, no preamble.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = await res.json()
  const summary = (data.content?.[0]?.text || '').trim()
  return { summary, prompt }
}

/** Pick the drafter for the chosen mode. */
export function getGenerator(mode) {
  return mode === 'llm' && llmAvailable ? llmGenerate : mockGenerate
}
