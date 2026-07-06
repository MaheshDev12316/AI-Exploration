// ---------------------------------------------------------------------------
// Constraint configuration
// ---------------------------------------------------------------------------
// The verifier reads these values at run time. Edit this file to change the
// constraints WITHOUT touching verifier code (SHOULD: configurable rules).
//
// A "strict" and "lenient" profile is provided (GOOD-TO-HAVE: strict/lenient
// toggle). The active profile is chosen in the UI; both share the banned list
// and required-fact set but differ in tolerances.
// ---------------------------------------------------------------------------

/** Phrases that add words and zero information. Case-insensitive match. */
export const BANNED_PHRASES = [
  'synergy',
  'synergies',
  'touch base',
  'circle back',
  'circle round',
  'move the needle',
  'low-hanging fruit',
  'boil the ocean',
  'at the end of the day',
  'going forward',
  'leverage our',
  'best-in-class',
  'paradigm shift',
  'think outside the box',
  'value-add',
  'holistic',
  'streamline',
]

/** The facts every summary must carry, drawn from the structured input. */
export const REQUIRED_FACTS = ['account', 'amount', 'closeDate', 'ask']

/**
 * Tolerance profiles. `strict` is the executive-grade default; `lenient`
 * relaxes the caps so the pass-rate difference is visible in the metrics.
 */
export const PROFILES = {
  strict: {
    label: 'Strict',
    maxWords: 120,
    maxSentenceWords: 30,
    // exact-match tolerance for money, in dollars. 0 = must be exact.
    amountToleranceDollars: 0,
    // how many days a stated close date may drift from the input.
    dateToleranceDays: 0,
    enforceBannedPhrases: true,
    // fraction of the ask's significant keywords that must appear.
    askCoverage: 0.6,
  },
  lenient: {
    label: 'Lenient',
    maxWords: 160,
    maxSentenceWords: 40,
    amountToleranceDollars: 100_000, // tolerate rounding to nearest $0.1M
    dateToleranceDays: 7, // tolerate "end of quarter" drift
    enforceBannedPhrases: false,
    askCoverage: 0.4,
  },
}

export const MAX_ATTEMPTS = 5

/**
 * Build the effective ruleset used by the verifier for a given profile.
 * Extra user-defined constraints (GOOD-TO-HAVE: constraint composition) are
 * appended by the UI as `mustMention` tokens.
 */
export function buildRuleset(profileKey = 'strict', extras = {}) {
  const profile = PROFILES[profileKey] || PROFILES.strict
  return {
    profileKey,
    ...profile,
    bannedPhrases: BANNED_PHRASES,
    requiredFacts: REQUIRED_FACTS,
    // e.g. ["Acme Rival Corp"] — each becomes its own must-mention check.
    mustMention: Array.isArray(extras.mustMention) ? extras.mustMention : [],
  }
}
