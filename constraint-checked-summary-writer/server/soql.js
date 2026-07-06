// ---------------------------------------------------------------------------
// SOQL query construction for the Opportunity picker.
// ---------------------------------------------------------------------------
// Pure, deterministic, and unit-tested (soql.test.js) so the live query is
// proven even without a live org. NEVER interpolate raw user input: enums are
// allow-listed, numbers are clamped, and free text is SOQL-escaped.
// ---------------------------------------------------------------------------

/** Fields we read from Opportunity (real Salesforce API names). */
export const OPPORTUNITY_FIELDS = [
  'Id',
  'Name',
  'AccountId',
  'Account.Name',
  'Amount',
  'CloseDate',
  'StageName',
  'Probability',
  'ForecastCategoryName',
  'NextStep',
  'Description',
  'OwnerId',
  'Owner.Name',
  'IsClosed',
  'LastModifiedDate',
]

export const VIEWS = ['executive', 'account', 'mypipeline', 'recent']
export const TIMEFRAMES = {
  this_quarter: 'CloseDate = THIS_QUARTER',
  next_quarter: 'CloseDate = NEXT_QUARTER',
  next_90: 'CloseDate >= TODAY AND CloseDate <= NEXT_N_DAYS:90',
  this_year: 'CloseDate = THIS_YEAR',
  any: null,
}

/** Escape a value for use inside a single-quoted SOQL string literal. */
export function soqlEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/** Escape a value for a SOQL LIKE clause (also neutralise % and _ wildcards). */
export function soqlLikeEscape(value) {
  return soqlEscape(value).replace(/([%_])/g, '\\$1')
}

const clampInt = (n, lo, hi, dflt) => {
  const v = Number.parseInt(n, 10)
  if (Number.isNaN(v)) return dflt
  return Math.min(hi, Math.max(lo, v))
}

/**
 * Build a read-only Opportunity SOQL query from validated params.
 *
 * @param {object} p
 * @param {string} [p.view]        one of VIEWS (default 'executive')
 * @param {string} [p.timeframe]   key of TIMEFRAMES (executive view; default 'this_quarter')
 * @param {string} [p.account]     account-name contains filter
 * @param {string} [p.stage]       exact StageName filter
 * @param {string} [p.search]      free text over Name / Account.Name
 * @param {string} [p.ownerId]     required for the 'mypipeline' view
 * @param {number} [p.limit]       1..100 (default 25)
 * @param {number} [p.offset]      0..2000 (default 0)
 * @returns {string} SOQL
 */
export function buildOpportunitySoql(p = {}) {
  const view = VIEWS.includes(p.view) ? p.view : 'executive'
  const limit = clampInt(p.limit, 1, 100, 25)
  const offset = clampInt(p.offset, 0, 2000, 0)

  const where = []

  // Recent view still shows open deals; everything else too — closed deals do
  // not need an executive update.
  where.push('IsClosed = false')

  if (view === 'executive') {
    // Note: 'any' is a real key mapping to null (no date clause), so check key
    // presence rather than using ?? — which would treat null as "missing".
    const key = p.timeframe in TIMEFRAMES ? p.timeframe : 'this_quarter'
    const tf = TIMEFRAMES[key]
    if (tf) where.push(tf)
  }

  if (view === 'mypipeline') {
    if (!p.ownerId) throw new Error("view 'mypipeline' requires an ownerId")
    where.push(`OwnerId = '${soqlEscape(p.ownerId)}'`)
  }

  if (p.account) {
    where.push(`Account.Name LIKE '%${soqlLikeEscape(p.account)}%'`)
  }
  if (p.stage) {
    where.push(`StageName = '${soqlEscape(p.stage)}'`)
  }
  if (p.search) {
    const t = soqlLikeEscape(p.search)
    where.push(`(Name LIKE '%${t}%' OR Account.Name LIKE '%${t}%')`)
  }

  const orderBy =
    view === 'recent' ? 'LastModifiedDate DESC' : 'Amount DESC NULLS LAST, CloseDate ASC'

  return (
    `SELECT ${OPPORTUNITY_FIELDS.join(', ')} FROM Opportunity ` +
    `WHERE ${where.join(' AND ')} ` +
    `ORDER BY ${orderBy} ` +
    `LIMIT ${limit} OFFSET ${offset}`
  )
}
