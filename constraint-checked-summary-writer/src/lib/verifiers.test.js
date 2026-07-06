import { describe, it, expect } from 'vitest'
import {
  parseMoney,
  extractMoney,
  parseDate,
  extractDates,
  countWords,
  splitSentences,
  checkWordCount,
  checkSentenceLength,
  checkBannedPhrases,
  checkAccount,
  checkAmount,
  checkCloseDate,
  checkAsk,
  checkMustMention,
  verifySummary,
} from './verifiers.js'
import { buildRuleset } from '../config/rules.js'

const R = buildRuleset('strict')
const LENIENT = buildRuleset('lenient')

const INPUT = {
  account: 'Contoso Global',
  amount: '$1.37M',
  closeDate: '2026-03-31',
  ask: 'need a VP on Thursday call',
}

describe('money parsing', () => {
  it('parses shorthand and full forms to exact dollars', () => {
    expect(parseMoney('$1.37M')).toBe(1_370_000)
    expect(parseMoney('$1,370,000')).toBe(1_370_000)
    expect(parseMoney('1.37 million')).toBe(1_370_000)
    expect(parseMoney('$1.4M')).toBe(1_400_000)
    expect(parseMoney('$950K')).toBe(950_000)
    expect(parseMoney('$2B')).toBe(2_000_000_000)
  })

  it('extracts money but ignores plain numbers and years', () => {
    const found = extractMoney('The 2026 deal is worth $1.37M across 120 seats.')
    expect(found.map((f) => f.value)).toEqual([1_370_000])
  })
})

describe('date parsing', () => {
  it('parses several formats to the same day', () => {
    const iso = parseDate('2026-03-31').day
    expect(parseDate('March 31, 2026').day).toBe(iso)
    expect(parseDate('31 March 2026').day).toBe(iso)
    expect(parseDate('03/31/2026').day).toBe(iso)
  })
  it('extracts only year-bearing dates', () => {
    const d = extractDates('Closes March 31, 2026 after review on the 5th.')
    expect(d).toHaveLength(1)
    expect(d[0].y).toBe(2026)
  })
})

describe('text helpers', () => {
  it('counts words ignoring stray punctuation', () => {
    expect(countWords('Deal worth $1.37M — closes soon.')).toBe(5)
  })
  it('splits sentences', () => {
    expect(splitSentences('One thing. Two things! Three?')).toHaveLength(3)
  })
})

describe('word-count verifier', () => {
  it('fails when over the limit', () => {
    const long = Array(121).fill('word').join(' ')
    expect(checkWordCount(long, INPUT, R).passed).toBe(false)
    expect(checkWordCount('short summary', INPUT, R).passed).toBe(true)
  })
})

describe('sentence-length verifier', () => {
  it('flags any sentence over 30 words', () => {
    const s = Array(31).fill('w').join(' ') + '.'
    const res = checkSentenceLength(s, INPUT, R)
    expect(res.passed).toBe(false)
    expect(res.feedback).toMatch(/Sentence 1/)
  })
})

describe('banned-phrase verifier', () => {
  it('catches a banned phrase and reports its sentence', () => {
    const res = checkBannedPhrases('All good here. Let us circle back next week.', INPUT, R)
    expect(res.passed).toBe(false)
    expect(res.feedback).toMatch(/circle back/)
    expect(res.feedback).toMatch(/sentence 2/)
  })
  it('is disabled under the lenient profile', () => {
    expect(checkBannedPhrases('circle back', INPUT, LENIENT).passed).toBe(true)
  })
})

describe('account verifier', () => {
  it('requires the account name verbatim', () => {
    expect(checkAccount('Contoso Global is progressing.', INPUT, R).passed).toBe(true)
    expect(checkAccount('The customer is progressing.', INPUT, R).passed).toBe(false)
  })
})

// -- THE headline case: $1.37M must NOT be accepted as "$1.4M" ---------------
describe('amount fidelity (the $1.37M rounding case)', () => {
  it('FAILS when $1.37M is rounded to $1.4M', () => {
    const res = checkAmount('Contoso Global deal at $1.4M closes 2026-03-31.', INPUT, R)
    expect(res.passed).toBe(false)
    expect(res.feedback).toMatch(/\$1\.4M/)
    expect(res.feedback).toMatch(/do not round|Do NOT round/i)
  })
  it('PASSES with the exact figure', () => {
    expect(checkAmount('Contoso Global at $1.37M.', INPUT, R).passed).toBe(true)
    expect(checkAmount('Contoso Global at $1,370,000.', INPUT, R).passed).toBe(true)
  })
  it('the lenient profile tolerates rounding to $0.1M', () => {
    expect(checkAmount('Contoso Global at $1.4M.', INPUT, LENIENT).passed).toBe(true)
  })
  it('fails when the amount is missing entirely', () => {
    expect(checkAmount('Contoso Global is progressing well.', INPUT, R).passed).toBe(false)
  })
})

describe('close-date fidelity', () => {
  it('fails on a wrong date, passes on the exact date', () => {
    expect(checkCloseDate('Closes 2026-04-30.', INPUT, R).passed).toBe(false)
    expect(checkCloseDate('Closes March 31, 2026.', INPUT, R).passed).toBe(true)
  })
})

describe('ask verifier', () => {
  it('passes when the ask keywords are covered', () => {
    expect(checkAsk('We need a VP on the Thursday call.', INPUT, R).passed).toBe(true)
  })
  it('fails when the ask is absent', () => {
    expect(checkAsk('The deal is going well overall.', INPUT, R).passed).toBe(false)
  })
})

describe('constraint composition (must-mention)', () => {
  it('adds a check only when configured', () => {
    expect(checkMustMention('no rival here', INPUT, R)).toBeNull()
    const withRival = buildRuleset('strict', { mustMention: ['Initech'] })
    expect(checkMustMention('We beat Initech on price.', INPUT, withRival).passed).toBe(true)
    expect(checkMustMention('We won on price.', INPUT, withRival).passed).toBe(false)
  })
})

describe('full verifier aggregation', () => {
  it('a clean summary passes every check', () => {
    const good =
      'Contoso Global is at $1.37M and closes on 2026-03-31. We need a VP on the Thursday call to approve the discount.'
    const res = verifySummary(good, INPUT, R)
    expect(res.passed).toBe(true)
    expect(res.feedback).toHaveLength(0)
  })
  it('a flawed summary fails and emits targeted feedback', () => {
    const bad =
      'Contoso Global at $1.4M. Let us circle back to align on synergy going forward.'
    const res = verifySummary(bad, INPUT, R)
    expect(res.passed).toBe(false)
    expect(res.feedback.length).toBeGreaterThan(0)
  })
})
