# Constraint-Checked Summary Writer — TS-05

An executive-summary generator for sales **deal updates** that must satisfy
**hard, code-verified constraints** — length limits, required facts present and
_exactly_ correct, banned phrases absent — and iterates with **targeted
feedback** until its output passes every check, or it reports an **honest
failure**.

> The LLM drafts. **Deterministic code verifies.** Only verified output ships.

Built on the Next Quarter world (accounts, pipeline, forecasts). All data is
fictional.

---

## What it does

Executives act on the number and the ask in a deal update — `$1.37M` is **not**
`$1.4M`, because someone repeats that figure to a board. Language models round,
drop the ask, and pad with fluff. And an AI grading its own homework is
worthless for numbers people will act on.

So this app enforces the rules the only trustworthy way:

```
        ┌──────────────┐   draft    ┌────────────────────┐
        │  Generator   │ ─────────▶ │  Deterministic      │
        │ (LLM / mock) │            │  Verifier (code)    │
        └──────────────┘            └────────────────────┘
              ▲                               │
              │   targeted corrections        │ pass?
              │   ("$1.4M ≠ $1.37M; don't     │
              │    round"; "banned phrase     ▼
              │    'circle back' @ sent. 3")  ├── yes ─▶  ✅ Accepted summary
              └───────────────────────────────┤            (all checks passed)
                       regenerate (max 5)      └── no, budget exhausted ─▶
                                                   ⚠️ Honest failure + best attempt
```

Every attempt — its draft, the per-check verdict, and the exact prompt that
produced it — is recorded and shown in a live timeline.

---

## Quick start

```bash
cd constraint-checked-summary-writer
npm install
npm run dev        # open the printed http://localhost:5173 URL
```

That's it — **no API key required.** The default "drafter" is a deterministic,
offline generator, so the entire generate → verify → retry flow is clickable on
sample data out of the box.

```bash
npm test           # run the verifier unit tests (incl. the $1.37M case)
npm run build      # production build
npm run preview    # serve the production build
```

### Optional: use a live LLM

Copy `.env.example` to `.env` and add an Anthropic key:

```bash
VITE_ANTHROPIC_API_KEY=sk-ant-...
# VITE_ANTHROPIC_MODEL=claude-sonnet-5   # optional override
```

Then pick **Live LLM** as the drafter in the UI. The verifier is identical
either way — the model is never asked whether it complied.

> Note: the browser calls the Anthropic API directly for local-demo simplicity
> (`anthropic-dangerous-direct-browser-access`). In production you would proxy
> this through a small backend so the key never reaches the client. The
> deterministic verifier is where trust lives and is fully client-side.

---

## The verifiers (algorithms & known limitations)

All verifiers live in [`src/lib/verifiers.js`](src/lib/verifiers.js) as plain,
unit-tested functions. Each returns `{ id, label, passed, detail, feedback }`;
`feedback` is the targeted correction fed back into the next attempt. The
LLM is **never** consulted about compliance.

| Verifier | Algorithm | Known limitations |
|---|---|---|
| **Length ≤ N words** | Split on whitespace, count tokens containing a letter/digit; fail if `> maxWords` (120 strict / 160 lenient). | Hyphenated compounds count as one token. |
| **No sentence > N words** | Split on `.?!`, count words per sentence; fail any over `maxSentenceWords` (30 / 40). | Abbreviations ("e.g.") can over-split; kept simple on purpose. |
| **No banned phrases** | Word-boundary, case-insensitive regex for each phrase in the config list; report phrase + sentence index. | Only matches configured surface forms; won't catch novel fluff. Off in lenient profile. |
| **Account named** | Case-insensitive substring match of the exact input account name. | Requires the name verbatim; won't accept abbreviations/aliases. |
| **Amount exact** | `parseMoney` canonicalises the input to integer dollars (`$1.37M`, `$1,370,000`, `1.37 million` → `1370000`). `extractMoney` pulls every monetary figure from the draft (must have `$` or a magnitude suffix, so years/word-counts are ignored). **Fails if the exact figure is absent OR any conflicting figure appears** — this is what catches `$1.37M` rounded to `$1.4M`. Tolerance is configurable (0 strict, ±$100k lenient). | Any stray dollar figure in the draft counts as a conflict. |
| **Close date exact** | `parseDate` accepts ISO, `Month D, YYYY`, `D Month YYYY`, `MM/DD/YYYY` → a canonical day-number. `extractDates` finds all year-bearing dates. Fail if the exact date is absent or a conflicting date appears (±`dateToleranceDays`). | Only year-bearing dates are recognised; a vague source like "end of Q2" is **intentionally** unverifiable → honest failure. |
| **The ask is stated** | Extract significant keywords (len ≥ 3, non-stopword) from the input ask; pass if the draft covers ≥ `askCoverage` of them (60% strict / 40% lenient). | Keyword coverage, not semantic parsing; a wildly paraphrased ask could slip or falsely fail. Chosen because it is deterministic and testable. |
| **Must mention (composition)** | Only added when the user supplies extra tokens; case-insensitive substring per token. | Substring only. |

**Configurable rules (no code changes):** edit
[`src/config/rules.js`](src/config/rules.js) — word limit, sentence cap, banned
list, tolerances, and the strict/lenient profiles all live there. The verifier
reads them at run time.

---

## The retry loop

[`src/lib/loop.js`](src/lib/loop.js) orchestrates:

1. Generate a draft (with the recorded prompt, including prior corrections).
2. Run **every** verifier; aggregate `passed` + a list of targeted `feedback`.
3. If passed → **accept**. Else feed the feedback into the next attempt.
4. After `MAX_ATTEMPTS` (5) → **honest failure**, surfacing the best attempt
   (most checks passed) and the checks it could not satisfy.

Generator errors are caught and recorded as a failed attempt, not hidden.

---

## Batch metrics — the loop's measured value

Click **Run 20 generations** in the UI (or see `src/lib/metrics.js`). It reports
**first-attempt pass rate vs. final pass rate**; the delta is what the loop earns.

With the deterministic drafter across the four samples:

| Metric | Value |
|---|---|
| First-attempt pass rate | **0%** (the offline drafter always starts sloppy by design) |
| Final pass rate | **75%** |
| Delta | **+75 points** |
| Avg attempts | ~3.8 |

Final pass rate is deliberately **below 100%**: the "vague close date" sample is
genuinely unverifiable, so the loop honestly cannot fix it. With a real LLM the
first-attempt rate is non-zero; the delta is the point.

---

## Architecture

```
src/
  config/rules.js       Configurable constraints + strict/lenient profiles (edit me)
  lib/
    verifiers.js        Deterministic checkers — the quality gate (unit-tested)
    verifiers.test.js   21 tests incl. the $1.37M-vs-$1.4M rounding case
    generator.js        Offline deterministic drafter + optional Anthropic drafter
    loop.js             generate → verify → retry orchestration (max 5)
    samples.js          Fictional, Salesforce-shaped sample deal updates
    metrics.js          Batch runner: first-attempt vs final pass rate
  components/           InputPane, Timeline, ResultCard, MetricsPanel, RulesPanel
  App.jsx               State + layout
```

**Design principle:** the generator and verifier know nothing about each other.
Swapping the mock drafter for a real LLM (or adding a verifier) touches one file.
Trust lives entirely in deterministic, tested code.

---

## How this maps to the brief

- **Core UI** — input pane, live attempt timeline with per-check reports, and
  both end states (accepted badge / honest-failure card). Clickable on sample
  data with no key.
- **Live loop** — real generate → verify → retry with targeted feedback; the
  timeline shows real attempts (the Contoso sample forces 2 retries).
- **Deterministic, unit-tested verifiers** — the LLM never grades itself.
- **Fact fidelity** — `$1.37M` rounded to `$1.4M` fails and is corrected.
- **Honest failure** — exhausted attempts → best attempt + failing checks.
- **SHOULD** — targeted feedback visible in recorded prompts; batch metrics;
  config-file rules.
- **GOOD-TO-HAVE** — strict/lenient toggle; constraint composition (must-mention).
