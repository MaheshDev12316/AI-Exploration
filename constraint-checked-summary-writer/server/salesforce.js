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
  const useOAuth = Boolean(sf.clientId && sf.clientSecret)

  // With a connected app, login() uses the OAuth2 username-password grant;
  // without one it uses SOAP login (disabled by default in newer orgs).
  const conn = useOAuth
    ? new jsforce.Connection({
        oauth2: {
          loginUrl: sf.loginUrl,
          clientId: sf.clientId,
          clientSecret: sf.clientSecret,
        },
        version: sf.apiVersion,
      })
    : new jsforce.Connection({ loginUrl: sf.loginUrl, version: sf.apiVersion })

  try {
    await conn.login(sf.username, password)
    return conn
  } catch (err) {
    if (/SOAP API login\(\) is disabled/i.test(err.message) && !useOAuth) {
      throw new Error(
        'SOAP API login is disabled in this org (common for new Dev orgs). ' +
          'Create a Connected App, set SF_CLIENT_ID and SF_CLIENT_SECRET in server/.env, ' +
          'and enable "Allow OAuth Username-Password Flows" under Setup → OAuth and OpenID ' +
          'Connect Settings. See the README (Salesforce setup).',
      )
    }
    throw err
  }
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
