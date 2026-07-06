// ---------------------------------------------------------------------------
// Deterministic verifiers  —  the quality gate.
// ---------------------------------------------------------------------------
// These are plain, testable functions. The LLM is NEVER asked whether its own
// output complies; compliance is decided here, in code. Each check returns a
// structured verdict so the UI can render a per-check report, and every failed
// check emits `feedback`: a targeted correction the loop feeds back to the LLM.
//
// See README.md for a per-verifier description of the algorithm and its known
// limitations.
// ---------------------------------------------------------------------------

// ---- text helpers ---------------------------------------------------------

/** Split prose into sentences on . ? ! (keeping it deliberately simple). */
export function splitSentences(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Count "real" words — tokens that contain a letter or a digit. */
export function countWords(text) {
  return String(text)
    .trim()
    .split(/\s+/)
    .filter((t) => /[A-Za-z0-9]/.test(t)).length
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'at',
  'by', 'with', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'we', 'our', 'us', 'i', 'you', 'they', 'them', 'this', 'that', 'these',
  'those', 'it', 'as', 'need', 'needs', 'want', 'please', 'would', 'could',
  'will', 'shall', 'get', 'got',
])

/** Significant lower-cased tokens (len >= 3, non-stopword) for coverage checks. */
export function keywords(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
}

// ---- money parsing --------------------------------------------------------

const MAGNITUDE = {
  k: 1e3, thousand: 1e3,
  m: 1e6, mm: 1e6, mn: 1e6, million: 1e6,
  b: 1e9, bn: 1e9, billion: 1e9,
}

/** Parse a single money string ("$1.37M", "1,370,000", "$1.4 million") → dollars. */
export function parseMoney(str) {
  if (str == null) return null
  const s = String(str).trim().toLowerCase()
  const m = s.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(k|mm|mn|m|bn|b|thousand|million|billion)?/)
  if (!m) return null
  const num = parseFloat(m[1].replace(/,/g, ''))
  if (Number.isNaN(num)) return null
  const mult = m[2] ? MAGNITUDE[m[2]] ?? 1 : 1
  return Math.round(num * mult)
}

/**
 * Extract every monetary figure mentioned in free text. A token counts as
 * money only if it has a `$` sign OR a magnitude suffix (M/K/B/million…), so
 * plain numbers (word counts, years) are not mistaken for amounts.
 */
export function extractMoney(text) {
  const out = []
  const re =
    /\$\s?\d[\d,]*(?:\.\d+)?\s*(?:mm|mn|m|bn|b|k|thousand|million|billion)?|\b\d[\d,]*(?:\.\d+)?\s*(?:mm|mn|bn|thousand|million|billion|m|k|b)\b/gi
  let match
  while ((match = re.exec(text)) !== null) {
    const raw = match[0].trim()
    const value = parseMoney(raw)
    if (value != null) out.push({ raw, value })
  }
  return out
}

// ---- date parsing ---------------------------------------------------------

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9,
  sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
}

/** Canonicalise a date to a day-number for tolerance-aware comparison. */
function toDayNumber(y, m, d) {
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/** Parse a single date string in several common formats → {y,m,d,day} or null. */
export function parseDate(str) {
  if (!str) return null
  const s = String(str).trim().toLowerCase()

  // ISO: 2026-03-31
  let m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (m) return mk(+m[1], +m[2], +m[3])

  // Month name first: march 31, 2026  /  march 31 2026 / mar 31st, 2026
  m = s.match(/\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/)
  if (m && MONTHS[m[1]]) return mk(+m[3], MONTHS[m[1]], +m[2])

  // Day first: 31 march 2026
  m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?,?\s+(\d{4})\b/)
  if (m && MONTHS[m[2]]) return mk(+m[3], MONTHS[m[2]], +m[1])

  // Numeric slash: 03/31/2026 (US, month-first)
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/)
  if (m) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]
    return mk(y, +m[1], +m[2])
  }
  return null

  function mk(y, mo, d) {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
    return { y, m: mo, d, day: toDayNumber(y, mo, d) }
  }
}

/** Extract all full (year-bearing) dates from free text. */
export function extractDates(text) {
  const out = []
  const patterns = [
    /\b\d{4}-\d{2}-\d{2}\b/gi,
    /\b[a-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
    /\b\d{1,2}(?:st|nd|rd|th)?\s+[a-z]{3,9}\.?,?\s+\d{4}\b/gi,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(text)) !== null) {
      const parsed = parseDate(m[0])
      if (parsed) out.push({ raw: m[0].trim(), ...parsed })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Individual verifiers. Each returns:
//   { id, label, passed, detail, feedback }
// `detail`   — human-readable status shown in the report (pass or fail).
// `feedback` — targeted correction sent to the LLM (only when failed).
// ---------------------------------------------------------------------------

export function checkWordCount(summary, _input, r) {
  const words = countWords(summary)
  const passed = words <= r.maxWords
  return {
    id: 'word-count',
    label: `Length ≤ ${r.maxWords} words`,
    passed,
    detail: `${words} / ${r.maxWords} words`,
    feedback: passed
      ? null
      : `Too long: ${words} words (limit ${r.maxWords}). Cut ${words - r.maxWords}+ words; remove filler, keep facts.`,
  }
}

export function checkSentenceLength(summary, _input, r) {
  const sentences = splitSentences(summary)
  const offenders = sentences
    .map((s, i) => ({ i: i + 1, n: countWords(s), s }))
    .filter((x) => x.n > r.maxSentenceWords)
  const passed = offenders.length === 0
  return {
    id: 'sentence-length',
    label: `No sentence > ${r.maxSentenceWords} words`,
    passed,
    detail: passed
      ? `Longest sentence ${Math.max(0, ...sentences.map(countWords))} words`
      : `${offenders.length} sentence(s) too long`,
    feedback: passed
      ? null
      : offenders
          .map(
            (o) =>
              `Sentence ${o.i} is ${o.n} words (max ${r.maxSentenceWords}). Split it into shorter sentences.`,
          )
          .join(' '),
  }
}

export function checkBannedPhrases(summary, _input, r) {
  if (!r.enforceBannedPhrases) {
    return {
      id: 'banned-phrases',
      label: 'No banned phrases',
      passed: true,
      detail: 'Not enforced (lenient profile)',
      feedback: null,
    }
  }
  const sentences = splitSentences(summary)
  const hits = []
  for (const phrase of r.bannedPhrases) {
    const re = new RegExp(`\\b${escapeRe(phrase)}\\b`, 'i')
    sentences.forEach((s, idx) => {
      if (re.test(s)) hits.push({ phrase, sentence: idx + 1 })
    })
  }
  const passed = hits.length === 0
  return {
    id: 'banned-phrases',
    label: 'No banned phrases',
    passed,
    detail: passed
      ? 'None found'
      : hits.map((h) => `"${h.phrase}" @ sentence ${h.sentence}`).join(', '),
    feedback: passed
      ? null
      : hits
          .map(
            (h) =>
              `Banned phrase "${h.phrase}" at sentence ${h.sentence}; remove it and state the point plainly.`,
          )
          .join(' '),
  }
}

export function checkAccount(summary, input, _r) {
  const account = (input.account || '').trim()
  const passed = account.length > 0 && summary.toLowerCase().includes(account.toLowerCase())
  return {
    id: 'account-present',
    label: 'Account named',
    passed,
    detail: passed ? `"${account}" present` : `"${account}" missing`,
    feedback: passed ? null : `The account name "${account}" must appear verbatim. Add it.`,
  }
}

export function checkAmount(summary, input, r) {
  const required = parseMoney(input.amount)
  const found = extractMoney(summary)
  if (required == null) {
    return {
      id: 'amount-fidelity',
      label: 'Amount exact',
      passed: false,
      detail: 'No valid input amount to check',
      feedback: 'No parseable amount was supplied in the input fields.',
    }
  }
  const within = (v) => Math.abs(v - required) <= r.amountToleranceDollars
  const match = found.find((f) => within(f.value))
  const conflicts = found.filter((f) => !within(f.value))
  const passed = !!match && conflicts.length === 0
  const reqLabel = input.amount

  let detail, feedback
  if (passed) {
    detail = `${reqLabel} present & exact`
  } else if (!match && conflicts.length > 0) {
    detail = `Says ${conflicts[0].raw}, needs ${reqLabel}`
    feedback = `Amount ${conflicts[0].raw} does not match the exact figure ${reqLabel} (${required.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}). Do NOT round — state ${reqLabel} exactly.`
  } else if (!match) {
    detail = `${reqLabel} missing`
    feedback = `The exact amount ${reqLabel} is missing. State it verbatim, unrounded.`
  } else {
    detail = `Extra conflicting figure ${conflicts[0].raw}`
    feedback = `Remove the conflicting figure ${conflicts[0].raw}; the only amount should be ${reqLabel}.`
  }
  return { id: 'amount-fidelity', label: 'Amount exact', passed, detail, feedback: passed ? null : feedback }
}

export function checkCloseDate(summary, input, r) {
  const required = parseDate(input.closeDate)
  const found = extractDates(summary)
  if (!required) {
    return {
      id: 'date-fidelity',
      label: 'Close date exact',
      passed: false,
      detail: 'No valid input date to check',
      feedback: 'No parseable close date was supplied in the input fields.',
    }
  }
  const within = (d) => Math.abs(d.day - required.day) <= r.dateToleranceDays
  const match = found.find(within)
  const conflicts = found.filter((d) => !within(d))
  const passed = !!match && conflicts.length === 0
  const reqLabel = input.closeDate

  let detail, feedback
  if (passed) {
    detail = `${reqLabel} present & exact`
  } else if (!match && conflicts.length > 0) {
    detail = `Says ${conflicts[0].raw}, needs ${reqLabel}`
    feedback = `Close date ${conflicts[0].raw} does not match ${reqLabel}. State the exact close date ${reqLabel}.`
  } else if (!match) {
    detail = `${reqLabel} missing`
    feedback = `The exact close date ${reqLabel} is missing. State it in full (with the year).`
  } else {
    detail = `Extra conflicting date ${conflicts[0].raw}`
    feedback = `Remove the conflicting date ${conflicts[0].raw}; the only close date should be ${reqLabel}.`
  }
  return { id: 'date-fidelity', label: 'Close date exact', passed, detail, feedback: passed ? null : feedback }
}

export function checkAsk(summary, input, r) {
  const askKw = [...new Set(keywords(input.ask))]
  if (askKw.length === 0) {
    return {
      id: 'ask-present',
      label: 'The ask is stated',
      passed: false,
      detail: 'No ask supplied',
      feedback: 'No ask was supplied in the input fields.',
    }
  }
  const summaryKw = new Set(keywords(summary))
  const present = askKw.filter((k) => summaryKw.has(k))
  const coverage = present.length / askKw.length
  const passed = coverage >= r.askCoverage
  const missing = askKw.filter((k) => !summaryKw.has(k))
  return {
    id: 'ask-present',
    label: 'The ask is stated',
    passed,
    detail: `${Math.round(coverage * 100)}% of ask terms present`,
    feedback: passed
      ? null
      : `The explicit ask is not stated. Include the request "${input.ask}" (missing terms: ${missing.join(', ')}).`,
  }
}

export function checkMustMention(summary, _input, r) {
  if (!r.mustMention || r.mustMention.length === 0) return null // no check when unused
  const missing = r.mustMention.filter(
    (t) => !summary.toLowerCase().includes(String(t).toLowerCase()),
  )
  const passed = missing.length === 0
  return {
    id: 'must-mention',
    label: `Must mention: ${r.mustMention.join(', ')}`,
    passed,
    detail: passed ? 'All present' : `Missing: ${missing.join(', ')}`,
    feedback: passed ? null : `The summary must mention: ${missing.join(', ')}. Add it.`,
  }
}

// ---------------------------------------------------------------------------
// Orchestrator: run every applicable verifier and aggregate the verdict.
// ---------------------------------------------------------------------------
export function verifySummary(summary, input, ruleset) {
  const checks = [
    checkWordCount(summary, input, ruleset),
    checkSentenceLength(summary, input, ruleset),
    checkBannedPhrases(summary, input, ruleset),
    checkAccount(summary, input, ruleset),
    checkAmount(summary, input, ruleset),
    checkCloseDate(summary, input, ruleset),
    checkAsk(summary, input, ruleset),
    checkMustMention(summary, input, ruleset),
  ].filter(Boolean)

  const failed = checks.filter((c) => !c.passed)
  return {
    passed: failed.length === 0,
    checks,
    passedCount: checks.length - failed.length,
    totalCount: checks.length,
    // targeted, per-failure corrections — the whole point of the loop.
    feedback: failed.map((c) => c.feedback).filter(Boolean),
  }
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
