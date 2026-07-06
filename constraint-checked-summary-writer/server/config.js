import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Load server/.env regardless of the current working directory, so it works
// whether you run `cd server && npm start` or `node server/index.js` from root.
const here = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(here, '.env') })

const env = process.env

// A live connection needs, at minimum, a username + password (+ security token).
const hasCreds = Boolean(env.SF_USERNAME && env.SF_PASSWORD)

// Mode resolution: explicit SF_MOCK wins; otherwise live if creds exist, else mock.
const explicitMock = String(env.SF_MOCK || '').toLowerCase() === 'true'
const explicitLive = String(env.SF_MOCK || '').toLowerCase() === 'false'

export const config = {
  port: Number.parseInt(env.PORT, 10) || 8787,
  mode: explicitMock ? 'mock' : explicitLive || hasCreds ? 'live' : 'mock',
  hasCreds,
  salesforce: {
    loginUrl: env.SF_LOGIN_URL || 'https://login.salesforce.com',
    username: env.SF_USERNAME || '',
    password: env.SF_PASSWORD || '',
    securityToken: env.SF_SECURITY_TOKEN || '',
    // Optional OAuth2 connected-app credentials (password grant). If absent we
    // fall back to jsforce's SOAP login, which is fine for a Dev org.
    clientId: env.SF_CLIENT_ID || '',
    clientSecret: env.SF_CLIENT_SECRET || '',
    apiVersion: env.SF_API_VERSION || '60.0',
  },
}
