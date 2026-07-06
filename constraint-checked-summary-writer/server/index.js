// ---------------------------------------------------------------------------
// Read-only Salesforce Opportunity connector (Express).
// ---------------------------------------------------------------------------
// One API contract, two data sources:
//   • mode 'live' — real jsforce SOQL against a Dev org (salesforce.js)
//   • mode 'mock' — Salesforce-shaped fixture (mock.js), for offline testing
//
// The frontend calls these via the Vite dev proxy (/api → this server).
// ---------------------------------------------------------------------------

import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { mapOpportunity } from './mapping.js'
import { queryMock, MOCK_STAGES } from './mock.js'
import { queryOpportunitiesLive, pingLive } from './salesforce.js'
import { VIEWS, TIMEFRAMES } from './soql.js'

const app = express()
app.use(cors())
app.use(express.json())

const asyncRoute = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(`[error] ${req.method} ${req.path}:`, err.message)
    res.status(502).json({ error: 'salesforce_error', message: err.message })
  })

// ---- health ---------------------------------------------------------------
app.get('/api/health', asyncRoute(async (_req, res) => {
  const base = {
    ok: true,
    mode: config.mode,
    configured: config.mode === 'live' ? config.hasCreds : true,
    views: VIEWS,
    timeframes: Object.keys(TIMEFRAMES),
    stages: MOCK_STAGES, // hint for the UI stage filter (live orgs vary)
  }
  if (config.mode === 'live') {
    try {
      base.identity = await pingLive()
    } catch (err) {
      base.ok = false
      base.error = err.message
    }
  }
  res.json(base)
}))

// ---- opportunities --------------------------------------------------------
app.get('/api/opportunities', asyncRoute(async (req, res) => {
  const params = {
    view: req.query.view,
    timeframe: req.query.timeframe,
    account: req.query.account?.trim() || '',
    stage: req.query.stage?.trim() || '',
    search: req.query.search?.trim() || '',
    limit: req.query.limit,
    offset: req.query.offset,
  }

  const { records, totalSize } =
    config.mode === 'live' ? await queryOpportunitiesLive(params) : queryMock(params)

  const deals = records.map(mapOpportunity)
  res.json({
    mode: config.mode,
    total: totalSize,
    count: deals.length,
    offset: Number.parseInt(params.offset, 10) || 0,
    deals,
  })
}))

app.listen(config.port, () => {
  console.log(
    `Salesforce connector listening on :${config.port}  [mode=${config.mode}]` +
      (config.mode === 'mock'
        ? '  — serving fictional data. Set SF_* creds in server/.env for your Dev org.'
        : ''),
  )
})
