// ---------------------------------------------------------------------------
// Map a Salesforce Opportunity record → the app's input shape.
// ---------------------------------------------------------------------------
// Pure and unit-tested. The amount is formatted WITHOUT rounding so the
// deterministic fact-fidelity verifier can enforce the exact figure.
// ---------------------------------------------------------------------------

/** Format a numeric amount as an exact USD string, e.g. 1370000 → "$1,370,000". */
export function formatMoney(amount) {
  if (amount == null || amount === '' || Number.isNaN(Number(amount))) return ''
  const n = Number(amount)
  const hasCents = Math.round(n) !== n
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })
}

/**
 * @param {object} r a raw Opportunity record from jsforce (or the mock)
 * @returns a deal object: display metadata + the input fields the loop consumes
 */
export function mapOpportunity(r) {
  const account = r.Account?.Name || ''
  const amountValue = r.Amount ?? null
  const amount = formatMoney(amountValue)
  const closeDate = r.CloseDate || '' // Salesforce returns ISO yyyy-mm-dd
  const nextStep = r.NextStep || ''
  const description = r.Description || ''
  const stage = r.StageName || ''
  const probability = r.Probability ?? null
  const owner = r.Owner?.Name || ''

  // The Opportunity has no native "ask" field; NextStep is the closest.
  const ask = nextStep

  // A readable source blob for the drafter / for the user to edit.
  const raw = [
    `${r.Name}${account ? ` at ${account}` : ''} — ${stage}` +
      (probability != null ? ` (${probability}% to close)` : '') + '.',
    amount ? `Amount ${amount}, close date ${closeDate}.` : '',
    description ? description.trim() : '',
    nextStep ? `Next step: ${nextStep}` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return {
    id: r.Id,
    name: r.Name || '',
    account,
    amount,
    amountValue,
    closeDate,
    stage,
    probability,
    owner,
    nextStep,
    description,
    forecast: r.ForecastCategoryName || '',
    lastModified: r.LastModifiedDate || '',
    // fields the generate→verify→retry loop consumes:
    input: { account, amount, closeDate, ask, raw },
  }
}
