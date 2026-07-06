// ---------------------------------------------------------------------------
// Fictional sample deal updates (Next Quarter world — Salesforce-shaped).
// Amounts/dates are deliberately awkward ($1.37M, exact dates) to exercise
// fact fidelity. All records are invented; no real customer data.
// ---------------------------------------------------------------------------

export const SAMPLES = [
  {
    id: 'contoso',
    name: 'Contoso Global — Platform expansion',
    tag: 'Converges (2 fails → pass)',
    input: {
      account: 'Contoso Global',
      amount: '$1.37M',
      closeDate: '2026-03-31',
      ask: 'need a VP on the Thursday call to approve the discount',
      raw:
        'Multi-year platform expansion at Contoso Global. Procurement wants a small ' +
        'extra discount to sign this quarter; economic buyer is supportive but wants ' +
        'to see exec sponsorship. Deal is $1.37M, targeting close on 2026-03-31. ' +
        'Champion asked us to bring a VP to the Thursday call to approve the discount.',
    },
  },
  {
    id: 'northwind',
    name: 'Northwind Traders — Renewal + upsell',
    tag: 'Converges',
    input: {
      account: 'Northwind Traders',
      amount: '$842,500',
      closeDate: '2026-05-15',
      ask: 'need legal to fast-track the redlined MSA by Friday',
      raw:
        'Renewal plus a modest upsell at Northwind Traders worth $842,500. Signed ' +
        'verbal from the VP of Ops. Blocker is legal turnaround on the redlined MSA. ' +
        'Close date 2026-05-15. Ask: legal to fast-track the MSA by Friday.',
    },
  },
  {
    id: 'initech-competitor',
    name: 'Initech — Competitive displacement',
    tag: 'Composition: must mention competitor',
    extras: { mustMention: ['Globex'] },
    input: {
      account: 'Initech',
      amount: '$2.05M',
      closeDate: '2026-04-30',
      ask: 'need a reference customer intro before the bake-off',
      raw:
        'Competitive displacement of Globex at Initech, $2.05M, close 2026-04-30. ' +
        'We are ahead on security but Globex is discounting hard. Ask: a reference ' +
        'customer intro before the bake-off next week.',
    },
  },
  {
    id: 'ironbridge-failure',
    name: 'Ironbridge Capital — Vague close date',
    tag: 'Honest failure (no exact date in source)',
    input: {
      account: 'Ironbridge Capital',
      amount: '$3.6M',
      closeDate: 'end of Q2 2026', // NOT an exact date — cannot be verified
      ask: 'need the CRO to sponsor an executive dinner',
      raw:
        'Large new-logo at Ironbridge Capital, $3.6M. The buying committee will not ' +
        'commit to a firm signing date — best they will say is "end of Q2 2026". ' +
        'Ask: CRO to sponsor an executive dinner to build the relationship.',
    },
  },
]

export const DEFAULT_SAMPLE = SAMPLES[0]
