// ---------------------------------------------------------------------------
// Salesforce-shaped MOCK data + an in-memory query engine.
// ---------------------------------------------------------------------------
// Fictional records only, using real Opportunity field API names. This lets the
// entire deal-picker UX run and be tested WITHOUT a live org. The live path
// (salesforce.js) uses identical field names, so switching is just the data
// source. Close dates are generated relative to "today" so timeframe filters
// always return something.
// ---------------------------------------------------------------------------

const DAY = 86_400_000
const iso = (d) => new Date(d).toISOString().slice(0, 10)
const isoTs = (d) => new Date(d).toISOString()

function build() {
  const now = Date.now()
  const d = (days) => iso(now + days * DAY)
  const m = (days) => isoTs(now - days * DAY) // lastModified in the past

  // Awkward-on-purpose amounts (e.g. 1,370,000) to exercise fact fidelity.
  const rows = [
    ['Contoso Global - Platform Expansion', 'Contoso Global', 1_370_000, 12, 'Negotiation/Review', 70, 'Commit', 'Bring a VP to the Thursday call to approve the extra discount.', 'Multi-year platform expansion; procurement wants a small extra discount to sign this quarter.', 'Priya Raman', 3],
    ['Northwind Traders - Renewal + Upsell', 'Northwind Traders', 842_500, 25, 'Proposal/Price Quote', 60, 'Best Case', 'Legal to fast-track the redlined MSA by Friday.', 'Renewal plus a modest upsell; signed verbal from the VP of Ops.', 'Marco Diaz', 9],
    ['Initech - Competitive Displacement', 'Initech', 2_050_000, 40, 'Proposal/Price Quote', 55, 'Best Case', 'Reference-customer intro before the bake-off next week.', 'Displacing Globex; we are ahead on security but Globex is discounting hard.', 'Priya Raman', 1],
    ['Ironbridge Capital - New Logo', 'Ironbridge Capital', 3_600_000, 55, 'Value Proposition', 40, 'Pipeline', 'CRO to sponsor an executive dinner to build the relationship.', 'Large new-logo; buying committee will not commit to a firm signing date yet.', 'Sana Kapoor', 2],
    ['Umbrella Health - Analytics Suite', 'Umbrella Health', 1_215_000, 8, 'Negotiation/Review', 75, 'Commit', 'Confirm security review slot with their CISO this week.', 'Analytics suite for the payer division; security review is the last gate.', 'Marco Diaz', 4],
    ['Stark Industries - Expansion', 'Stark Industries', 4_900_000, 20, 'Negotiation/Review', 65, 'Best Case', 'Exec sponsor to align with their CFO on payment terms.', 'Expansion into two new business units; CFO wants annual not monthly billing.', 'Sana Kapoor', 6],
    ['Wayne Enterprises - Security Add-on', 'Wayne Enterprises', 675_000, 33, 'Proposal/Price Quote', 50, 'Pipeline', 'Send the updated ROI model to the sponsor.', 'Security add-on to an existing footprint; sponsor asked for a tighter ROI story.', 'Priya Raman', 11],
    ['Soylent Corp - Pilot to Production', 'Soylent Corp', 1_050_000, 48, 'Value Proposition', 45, 'Pipeline', 'Schedule the production-readiness review.', 'Converting a successful pilot to production; needs a readiness review.', 'Marco Diaz', 7],
    ['Cyberdyne Systems - AI Platform', 'Cyberdyne Systems', 2_780_000, 15, 'Negotiation/Review', 70, 'Commit', 'Get sign-off on the data-residency addendum.', 'AI platform deal; data-residency addendum is the final blocker.', 'Sana Kapoor', 2],
    ['Gekko & Co - Trading Analytics', 'Gekko & Co', 925_000, 60, 'Prospecting', 20, 'Omitted', 'Book the discovery workshop.', 'Early-stage trading-analytics opportunity; still qualifying.', 'Marco Diaz', 14],
    ['Nakatomi Trading - Global Rollout', 'Nakatomi Trading', 5_400_000, 70, 'Value Proposition', 35, 'Pipeline', 'Confirm regional sponsors for APAC and EMEA.', 'Global rollout across three regions; needs regional sponsorship.', 'Sana Kapoor', 5],
    ['Tyrell Corp - Data Migration', 'Tyrell Corp', 1_490_000, 18, 'Proposal/Price Quote', 55, 'Best Case', 'Align on the migration cutover window.', 'Data migration project; cutover window must avoid their peak season.', 'Priya Raman', 8],
    ['Oscorp - Compliance Module', 'Oscorp', 388_000, 27, 'Negotiation/Review', 60, 'Best Case', 'Get procurement to release the PO.', 'Compliance module; approved by the sponsor, waiting on procurement.', 'Marco Diaz', 3],
    ['Massive Dynamic - R&D Platform', 'Massive Dynamic', 3_120_000, 44, 'Value Proposition', 40, 'Pipeline', 'Set up a technical deep-dive with their architects.', 'R&D platform; their architects want a deep-dive before committing.', 'Sana Kapoor', 10],
    ['Acme Corp - Warehouse Optimisation', 'Acme Corp', 760_000, 9, 'Negotiation/Review', 72, 'Commit', 'Confirm the go-live date with operations.', 'Warehouse optimisation; operations needs a firm go-live date.', 'Priya Raman', 1],
    ['Vandelay Industries - Import Suite', 'Vandelay Industries', 1_180_000, 52, 'Prospecting', 20, 'Omitted', 'Identify the economic buyer.', 'Import suite opportunity; economic buyer not yet identified.', 'Marco Diaz', 13],
    ['Hooli - XYZ Compression', 'Hooli', 2_260_000, 22, 'Proposal/Price Quote', 55, 'Best Case', 'Counter their ask for a bulk discount.', 'Compression platform; they are pushing hard for a bulk discount.', 'Sana Kapoor', 4],
    ['Pied Piper - Storage Platform', 'Pied Piper', 540_000, 31, 'Value Proposition', 45, 'Pipeline', 'Get the technical champion to present internally.', 'Storage platform; technical champion needs to sell it upward.', 'Priya Raman', 6],
    ['Globex Corporation - ERP Add-on', 'Globex Corporation', 1_805_000, 14, 'Negotiation/Review', 68, 'Commit', 'Resolve the SSO integration question.', 'ERP add-on; SSO integration detail is the last open item.', 'Marco Diaz', 2],
    ['Wonka Industries - Supply Chain', 'Wonka Industries', 995_000, 38, 'Proposal/Price Quote', 50, 'Pipeline', 'Send references in the CPG vertical.', 'Supply-chain deal; they want CPG-vertical references.', 'Sana Kapoor', 9],
    ['Bluth Company - Real Estate CRM', 'Bluth Company', 430_000, 62, 'Prospecting', 15, 'Omitted', 'Re-engage the sponsor after reorg.', 'Real-estate CRM; stalled after a sponsor reorg.', 'Marco Diaz', 20],
    ['Prestige Worldwide - Events Platform', 'Prestige Worldwide', 1_640_000, 19, 'Negotiation/Review', 66, 'Best Case', 'Lock the multi-year discount with finance.', 'Events platform; finance must approve the multi-year discount.', 'Priya Raman', 3],
    ['Dunder Mifflin - Paperless Suite', 'Dunder Mifflin', 288_000, 11, 'Negotiation/Review', 70, 'Commit', 'Get the branch manager sign-off.', 'Paperless suite; branch manager sign-off pending.', 'Marco Diaz', 5],
    ['Weyland-Yutani - Space Logistics', 'Weyland-Yutani', 6_250_000, 80, 'Value Proposition', 30, 'Pipeline', 'Secure budget line in next fiscal year.', 'Space-logistics platform; budget is next fiscal year.', 'Sana Kapoor', 12],
  ]

  return rows.map((r, i) => ({
    Id: `006MOCK${String(i + 1).padStart(10, '0')}`,
    Name: r[0],
    AccountId: `001MOCK${String(i + 1).padStart(10, '0')}`,
    Account: { Name: r[1] },
    Amount: r[2],
    CloseDate: d(r[3]),
    StageName: r[4],
    Probability: r[5],
    ForecastCategoryName: r[6],
    NextStep: r[7],
    Description: r[8],
    OwnerId: `005MOCK${(['Priya Raman', 'Marco Diaz', 'Sana Kapoor'].indexOf(r[9]) + 1)}`,
    Owner: { Name: r[9] },
    IsClosed: false,
    LastModifiedDate: m(r[10]),
  }))
}

const DATA = build()
const MOCK_OWNER_ID = '005MOCK1' // "Priya Raman" — the signed-in rep for mypipeline

const daysFromNow = (isoDate) => (new Date(isoDate + 'T00:00:00Z').getTime() - Date.now()) / DAY

function inTimeframe(row, timeframe) {
  const dd = daysFromNow(row.CloseDate)
  switch (timeframe) {
    case 'this_quarter': {
      const now = new Date()
      const q = Math.floor(now.getUTCMonth() / 3)
      const cd = new Date(row.CloseDate + 'T00:00:00Z')
      return cd.getUTCFullYear() === now.getUTCFullYear() && Math.floor(cd.getUTCMonth() / 3) === q
    }
    case 'next_90':
      return dd >= 0 && dd <= 90
    case 'this_year':
      return new Date(row.CloseDate).getUTCFullYear() === new Date().getUTCFullYear()
    case 'any':
    default:
      return true
  }
}

/** Query the mock set with the same filter/sort/pagination semantics as SOQL. */
export function queryMock(p = {}) {
  const view = ['executive', 'account', 'mypipeline', 'recent'].includes(p.view)
    ? p.view
    : 'executive'
  let rows = DATA.filter((r) => !r.IsClosed)

  if (view === 'executive') rows = rows.filter((r) => inTimeframe(r, p.timeframe || 'this_quarter'))
  if (view === 'mypipeline') rows = rows.filter((r) => r.OwnerId === MOCK_OWNER_ID)

  if (p.account) {
    const t = p.account.toLowerCase()
    rows = rows.filter((r) => r.Account.Name.toLowerCase().includes(t))
  }
  if (p.stage) rows = rows.filter((r) => r.StageName === p.stage)
  if (p.search) {
    const t = p.search.toLowerCase()
    rows = rows.filter(
      (r) => r.Name.toLowerCase().includes(t) || r.Account.Name.toLowerCase().includes(t),
    )
  }

  rows = rows.slice().sort((a, b) =>
    view === 'recent'
      ? new Date(b.LastModifiedDate) - new Date(a.LastModifiedDate)
      : (b.Amount ?? -Infinity) - (a.Amount ?? -Infinity),
  )

  const total = rows.length
  const limit = Math.min(100, Math.max(1, parseInt(p.limit, 10) || 25))
  const offset = Math.max(0, parseInt(p.offset, 10) || 0)
  return { records: rows.slice(offset, offset + limit), totalSize: total }
}

export const MOCK_STAGES = [...new Set(DATA.map((r) => r.StageName))]
