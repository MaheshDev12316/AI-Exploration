// ---------------------------------------------------------------------------
// Thin client for the Salesforce connector (server/). Calls go through the Vite
// dev proxy (/api → the connector). Every call fails loudly with a message the
// UI can show — no silent empty states.
// ---------------------------------------------------------------------------

const BASE = '/api'

async function getJson(url) {
  let res
  try {
    res = await fetch(url)
  } catch {
    throw new Error(
      'Cannot reach the Salesforce connector. Start it with `cd server && npm start`.',
    )
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`)
  return data
}

/** Connector health + mode (live | mock). */
export function fetchHealth() {
  return getJson(`${BASE}/health`)
}

/** Fetch a page of opportunities with the given filters. */
export function fetchDeals({
  view = 'executive',
  timeframe = 'this_quarter',
  account = '',
  stage = '',
  search = '',
  limit = 25,
  offset = 0,
} = {}) {
  const qs = new URLSearchParams({ view, timeframe, limit, offset })
  if (account) qs.set('account', account)
  if (stage) qs.set('stage', stage)
  if (search) qs.set('search', search)
  return getJson(`${BASE}/opportunities?${qs.toString()}`)
}
