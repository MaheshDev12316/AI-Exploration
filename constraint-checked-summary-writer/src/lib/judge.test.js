import { describe, it, expect } from 'vitest'
import { heuristicJudge } from './judge.js'

const INPUT = { account: 'Contoso Global', amount: '$1.37M', closeDate: '2026-03-31' }

describe('heuristic style judge (advisory)', () => {
  it('returns the full rubric with a 1..5 overall', () => {
    const r = heuristicJudge({
      summary: 'Contoso Global is at $1.37M and closes 2026-03-31. Need a VP on the call.',
      input: INPUT,
    })
    expect(r.source).toBe('heuristic')
    expect(r.dimensions).toHaveLength(4)
    expect(r.overall).toBeGreaterThanOrEqual(1)
    expect(r.overall).toBeLessThanOrEqual(5)
    r.dimensions.forEach((d) => {
      expect(d.score).toBeGreaterThanOrEqual(1)
      expect(d.score).toBeLessThanOrEqual(5)
    })
  })

  it('rewards a tight, specific summary over a hedged, vague one', () => {
    const tight = heuristicJudge({
      summary: 'Contoso Global at $1.37M, closes 2026-03-31. Need a VP Thursday to approve.',
      input: INPUT,
    })
    const vague = heuristicJudge({
      summary:
        'We think the Contoso Global deal is maybe going fairly well and we probably should be able to close it at some point, hopefully, if things sort of come together somewhat as we expect.',
      input: INPUT,
    })
    expect(tight.overall).toBeGreaterThan(vague.overall)
  })

  it('penalises hedging on the Directness dimension', () => {
    const r = heuristicJudge({
      summary: 'We think this maybe closes and we probably should be able to sign.',
      input: INPUT,
    })
    const directness = r.dimensions.find((d) => d.name === 'Directness')
    expect(directness.score).toBeLessThan(3)
  })

  it('is deterministic (same input → same score)', () => {
    const s = 'Contoso Global at $1.37M closes 2026-03-31. Need a VP on the call.'
    expect(heuristicJudge({ summary: s, input: INPUT })).toEqual(
      heuristicJudge({ summary: s, input: INPUT }),
    )
  })
})
