// ---------------------------------------------------------------------------
// Live Salesforce access via jsforce (read-only).
// ---------------------------------------------------------------------------
// Connection is lazy + cached. Auth uses the OAuth2 password grant when a
// connected app (SF_CLIENT_ID/SECRET) is configured, otherwise jsforce's SOAP
// login — the simplest path for a personal Developer Edition org.
//
// Credentials come from server/.env only (never committed). This whole module
// is a config-gated optional stretch per the brief; the core app never needs it.
// ---------------------------------------------------------------------------

import jsforce from 'jsforce'
import { config } from './config.js'
import { buildOpportunitySoql } from './soql.js'

let connPromise = null

async function connect() {
  const sf = config.salesforce
  const password = `${sf.password}${sf.securityToken || ''}`

  if (sf.clientId && sf.clientSecret) {
    // OAuth2 username-password grant against a connected app.
    const oauth2 = new jsforce.OAuth2({
      loginUrl: sf.loginUrl,
      clientId: sf.clientId,
      clientSecret: sf.clientSecret,
    })
    const conn = new jsforce.Connection({ oauth2, version: sf.apiVersion })
    await conn.login(sf.username, password)
    return conn
  }

  // SOAP login (no connected app required) — good enough for a Dev org.
  const conn = new jsforce.Connection({ loginUrl: sf.loginUrl, version: sf.apiVersion })
  await conn.login(sf.username, password)
  return conn
}

/** Get (and cache) an authenticated connection; retries once on failure. */
export async function getConnection() {
  if (!connPromise) {
    connPromise = connect().catch((err) => {
      connPromise = null // don't cache a failed attempt
      throw err
    })
  }
  return connPromise
}

/** Run the Opportunity query live and return raw records + total. */
export async function queryOpportunitiesLive(params) {
  const conn = await getConnection()

  // 'mypipeline' needs the signed-in user's id.
  const finalParams = { ...params }
  if (params.view === 'mypipeline') finalParams.ownerId = conn.userInfo?.id

  const soql = buildOpportunitySoql(finalParams)
  const result = await conn.query(soql)
  return { records: result.records || [], totalSize: result.totalSize ?? result.records?.length ?? 0, soql }
}

/** Lightweight identity/health probe. */
export async function pingLive() {
  const conn = await getConnection()
  const id = await conn.identity()
  return { organizationId: id.organization_id, user: id.username, instanceUrl: conn.instanceUrl }
}
