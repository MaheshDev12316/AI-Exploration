import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOpportunitySoql, soqlEscape, soqlLikeEscape } from './soql.js'
import { mapOpportunity, formatMoney } from './mapping.js'

test('executive view: open + this quarter, ordered by amount, limited', () => {
  const q = buildOpportunitySoql({ view: 'executive', limit: 25 })
  assert.match(q, /FROM Opportunity/)
  assert.match(q, /IsClosed = false/)
  assert.match(q, /CloseDate = THIS_QUARTER/)
  assert.match(q, /ORDER BY Amount DESC NULLS LAST/)
  assert.match(q, /LIMIT 25 OFFSET 0/)
})

test('timeframe next_90 uses a bounded date range', () => {
  const q = buildOpportunitySoql({ view: 'executive', timeframe: 'next_90' })
  assert.match(q, /CloseDate >= TODAY AND CloseDate <= NEXT_N_DAYS:90/)
})

test('timeframe any drops the date clause', () => {
  const q = buildOpportunitySoql({ view: 'executive', timeframe: 'any' })
  assert.doesNotMatch(q, /CloseDate =/)
  assert.doesNotMatch(q, /CloseDate >=/)
})

test('recent view orders by LastModifiedDate', () => {
  const q = buildOpportunitySoql({ view: 'recent' })
  assert.match(q, /ORDER BY LastModifiedDate DESC/)
})

test('mypipeline requires and injects ownerId', () => {
  assert.throws(() => buildOpportunitySoql({ view: 'mypipeline' }), /ownerId/)
  const q = buildOpportunitySoql({ view: 'mypipeline', ownerId: '005xx' })
  assert.match(q, /OwnerId = '005xx'/)
})

test('account, stage and search add filters', () => {
  const q = buildOpportunitySoql({ view: 'account', account: 'Contoso', stage: 'Negotiation/Review', search: 'expansion' })
  assert.match(q, /Account\.Name LIKE '%Contoso%'/)
  assert.match(q, /StageName = 'Negotiation\/Review'/)
  assert.match(q, /\(Name LIKE '%expansion%' OR Account\.Name LIKE '%expansion%'\)/)
})

test('limit is clamped and offset defaults', () => {
  assert.match(buildOpportunitySoql({ limit: 9999 }), /LIMIT 100 /)
  assert.match(buildOpportunitySoql({ limit: -5 }), /LIMIT 1 /)
})

// --- injection safety ------------------------------------------------------
test('SOQL injection via search is neutralised', () => {
  const q = buildOpportunitySoql({ search: "x' OR Name != '" })
  // the closing quote is escaped, so the OR cannot break out of the literal
  assert.match(q, /\\'/)
  assert.doesNotMatch(q, /LIKE '%x' OR Name/)
})

test('escapers handle quotes, backslashes and wildcards', () => {
  assert.equal(soqlEscape("a'b\\c"), "a\\'b\\\\c")
  assert.equal(soqlLikeEscape('50%_off'), '50\\%\\_off')
})

// --- mapping ---------------------------------------------------------------
test('formatMoney keeps the exact figure (no rounding)', () => {
  assert.equal(formatMoney(1_370_000), '$1,370,000')
  assert.equal(formatMoney(842_500), '$842,500')
  assert.equal(formatMoney(1_234.56), '$1,234.56')
  assert.equal(formatMoney(null), '')
})

test('mapOpportunity produces the loop input shape', () => {
  const deal = mapOpportunity({
    Id: '006x',
    Name: 'Contoso - Expansion',
    Account: { Name: 'Contoso Global' },
    Amount: 1_370_000,
    CloseDate: '2026-03-31',
    StageName: 'Negotiation/Review',
    Probability: 70,
    NextStep: 'Bring a VP to the Thursday call.',
    Description: 'Multi-year expansion.',
    Owner: { Name: 'Priya Raman' },
  })
  assert.equal(deal.account, 'Contoso Global')
  assert.equal(deal.amount, '$1,370,000')
  assert.equal(deal.closeDate, '2026-03-31')
  assert.equal(deal.input.ask, 'Bring a VP to the Thursday call.')
  assert.match(deal.input.raw, /Contoso Global/)
  assert.match(deal.input.raw, /\$1,370,000/)
})
