# LEARNINGS — Constraint-Checked Summary Writer

## What surprised me

- **Fact fidelity is a "no conflicting figure" problem, not a "contains the
  number" problem.** My first instinct was "does the summary contain `$1.37M`?"
  That passes a draft that says _"roughly $1.4M ($1.37M exact)"_ — which is
  exactly the executive-misleading output we're trying to kill. The rule that
  actually works: the exact figure must be present **and no other monetary
  figure may appear**. The same logic applies to dates. Writing the `$1.37M`
  test first (as the brief's tip advised) forced this realisation early.

- **Extracting money from prose is deceptively fiddly.** A naive number regex
  grabs the word count ("120"), the year ("2026"), and seat counts. Requiring a
  `$` sign _or_ a magnitude suffix (M/K/B/million) to qualify as "money" removed
  almost all false positives — and became its own unit test.

- **Honest failure is a feature, not a fallback.** The cleanest way to
  demonstrate it turned out to be a perfectly reasonable deal whose _source_
  never states an exact close date ("end of Q2"). The system can't invent a
  date it wasn't given, so it correctly refuses to ship. That tells a better
  story than an artificially broken input, and it keeps the batch pass rate
  honestly below 100%.

- **A deterministic "mock LLM" makes the whole thing demoable with zero
  credentials** — and, more importantly, makes the loop's behaviour
  reproducible. Because the drafter improves only on the corrections it's given,
  the timeline reliably shows two honest failures before a pass, which is
  exactly the core-UI scenario the brief asks for.

## What I'd do differently / next

- **The ask check is keyword-coverage, not semantics.** It's deterministic and
  testable (the right call for a hard gate), but a heavily paraphrased ask could
  slip through or falsely fail. A hybrid — keep the deterministic gate, add a
  clearly-separate LLM _judge_ for style/semantics (the GOOD-TO-HAVE) — would be
  the honest next step, kept firmly apart from the formal gate.

- **Proxy the LLM call.** For the demo the browser talks to Anthropic directly;
  production needs a tiny backend so the key never ships to the client. The
  verifier is already isolated and would move unchanged.

- **Sentence splitting is naive** (`.?!`), so "e.g." and "$1.37M." can mis-split.
  Fine for this corpus; a real deployment wants an abbreviation-aware splitter.

- **Structured feedback over strings.** Feedback is currently prose the next
  prompt embeds. Emitting structured correction objects (category + payload)
  would let the drafter target fixes more precisely and let me measure which
  correction types the model handles well.

## What went right

- Keeping the **generator and verifier fully decoupled** paid off: I swapped
  drafters (mock ↔ real LLM) and added the must-mention composition check
  without touching the loop. Trust stays in one small, tested file.
- **Tests first** on the verifiers meant the UI work never had to debug the
  gate — 21 tests, including every fidelity edge case, stayed green throughout.
