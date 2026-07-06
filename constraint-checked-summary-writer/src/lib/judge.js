// ---------------------------------------------------------------------------
// LLM Style Judge  (GOOD-TO-HAVE)  —  ADVISORY ONLY.
// ---------------------------------------------------------------------------
// This scores the *style* of a summary that has ALREADY passed the
// deterministic gate. It is deliberately kept apart from verification:
//
//   • It runs only on ACCEPTED (verified) summaries.
//   • It NEVER changes pass/fail — the formal gate is verifiers.js alone.
//   • Its output is presented separately and labelled "advisory".
//
// Two implementations share the contract:
//     judge({ summary, input }) => Promise<JudgeResult>
//
//   JudgeResult = {
//     source: 'heuristic' | 'llm',
//     overall: number,                       // 1..5, one decimal
//     dimensions: [{ name, score, note }],   // score 1..5
//     verdict: string,
//   }
//
// `heuristicJudge` is deterministic and offline (so the feature is demoable
// with no key). `llmJudge` asks Anthropic for the same rubric as JSON.
// ---------------------------------------------------------------------------

import { countWords, splitSentences, extractMoney, extractDates } from './verifiers.js'

const HEDGES = [
  'maybe', 'hopefully', 'we think', 'we believe', 'probably', 'perhaps',
  'sort of', 'kind of', 'i think', 'should be able', 'somewhat', 'possibly',
  'potentially', 'fairly', 'more or less', 'a bit',
]

const clamp = (n, lo = 1, hi = 5) => Math.max(lo, Math.min(hi, n))
const round1 = (n) => Math.round(n * 10) / 10

function verdictFor(overall) {
  if (overall >= 4.5) return 'Boardroom-ready.'
  if (overall >= 3.5) return 'Strong — minor polish only.'
  if (overall >= 2.5) return 'Serviceable; tighten the prose.'
  return 'Reads rough for an executive audience.'
}

/**
 * Deterministic, offline style scorer. Not a substitute for a real LLM judge —
 * a transparent stand-in so the panel works without credentials.
 */
export function heuristicJudge({ summary }) {
  const words = countWords(summary)
  const sentences = splitSentences(summary)
  const nSent = Math.max(1, sentences.length)
  const avgLen = words / nSent
  const lower = ` ${summary.toLowerCase()} `

  // Concision — shorter is better for an exec read.
  const concision = clamp(words <= 45 ? 5 : words <= 70 ? 4 : words <= 100 ? 3 : words <= 130 ? 2 : 1)

  // Clarity — average sentence length.
  const clarity = clamp(avgLen <= 14 ? 5 : avgLen <= 18 ? 4 : avgLen <= 23 ? 3 : avgLen <= 28 ? 2 : 1)

  // Directness — penalise hedging/filler.
  const hedgeHits = HEDGES.reduce((n, h) => n + (lower.includes(` ${h} `) ? 1 : 0), 0)
  const directness = clamp(5 - hedgeHits * 2)

  // Specificity — concrete figures and dates signal a decision-grade update.
  const hasMoney = extractMoney(summary).length > 0
  const hasDate = extractDates(summary).length > 0
  const specificity = clamp(Math.round(2 + (hasMoney ? 1.5 : 0) + (hasDate ? 1.5 : 0)))

  const dimensions = [
    { name: 'Concision', score: concision, note: `${words} words across ${nSent} sentence(s)` },
    { name: 'Clarity', score: clarity, note: `avg ${avgLen.toFixed(1)} words/sentence` },
    {
      name: 'Directness',
      score: directness,
      note: hedgeHits ? `${hedgeHits} hedging phrase(s)` : 'no hedging detected',
    },
    {
      name: 'Specificity',
      score: specificity,
      note: `${hasMoney ? 'amount' : 'no amount'} · ${hasDate ? 'date' : 'no date'}`,
    },
  ]

  const overall = round1(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length)
  return { source: 'heuristic', overall, dimensions, verdict: verdictFor(overall) }
}

// ---- real Anthropic judge -------------------------------------------------

const API_KEY = import.meta?.env?.VITE_ANTHROPIC_API_KEY
const MODEL = import.meta?.env?.VITE_ANTHROPIC_MODEL || 'claude-sonnet-5'

const RUBRIC = ['Concision', 'Clarity', 'Directness', 'Specificity']

export async function llmJudge({ summary }) {
  const prompt =
    `You are a STYLE judge for executive deal-update summaries. You are NOT a ` +
    `fact-checker or a compliance gate — score only writing style.\n\n` +
    `Score each dimension from 1 (poor) to 5 (excellent): ${RUBRIC.join(', ')}.\n` +
    `Return ONLY minified JSON, no prose:\n` +
    `{"dimensions":[{"name":"Concision","score":N,"note":"…"}, …],"verdict":"one short sentence"}\n\n` +
    `SUMMARY:\n${summary}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic judge error ${res.status}`)
  const data = await res.json()
  const text = (data.content?.[0]?.text || '').trim()
  const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
  const dimensions = (parsed.dimensions || []).map((d) => ({
    name: d.name,
    score: clamp(Number(d.score) || 0),
    note: d.note || '',
  }))
  const overall = dimensions.length
    ? round1(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length)
    : 0
  return { source: 'llm', overall, dimensions, verdict: parsed.verdict || verdictFor(overall) }
}

/** Pick the judge for the chosen mode (mirrors the drafter selection). */
export function getJudge(mode) {
  return mode === 'llm' && API_KEY ? llmJudge : heuristicJudge
}
