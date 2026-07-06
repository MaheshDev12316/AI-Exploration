# Demo User Guide — Constraint-Checked Summary Writer (TS-05)

A practical guide to **running** the app and **demoing** it. The slide deck is
`docs/DEMO_DECK.html` (open it in any browser; arrow keys / Space to navigate,
`F` for full screen).

---

## 1. What this app does (10-second version)

An executive-summary generator for sales deal updates. The LLM drafts a summary;
**deterministic code verifies** it against hard rules (exact amount, exact date,
the ask present, length caps, no banned phrases); failures become **targeted
corrections** and it retries — until every check passes or it reports an **honest
failure**. Only verified output ships.

---

## 2. Run it (offline — no API key)

```bash
cd constraint-checked-summary-writer
npm install
npm run dev            # open the printed http://localhost:5173
```

That's the whole demo. The default drafter is deterministic and offline, so the
full generate → verify → retry loop runs on sample data with **no credentials**.

Optional extras:

```bash
npm test               # 25 verifier/judge unit tests (incl. the $1.37M case)
npm run build          # production build
```

- **Live LLM drafter/judge:** copy `.env.example` → `.env`, set
  `VITE_ANTHROPIC_API_KEY`, restart, and pick “Live LLM” in the UI.
- **Salesforce deals:** see §6.

---

## 3. The screen, at a glance

- **Left — input pane:** sample deals, “Pull a deal from Salesforce”, the key
  fields (account, amount, close date, the ask), the raw update, the
  **strict/lenient** profile, an extra “must mention” constraint, and the drafter
  selector.
- **Right — results:** the **attempt timeline** (each draft + its per-check
  verification report + the corrections fed forward), the **accepted summary** or
  **honest-failure** card, the **LLM style judge**, **batch metrics**, and the
  **active constraints** panel.

---

## 4. Suggested demo run-of-show (~5 minutes)

**1) The core loop + fact fidelity (the headline).**
Leave the default **Contoso Global** sample selected → click **Generate → Verify
→ Retry**. Narrate as the timeline fills in:
- *Attempt 1 is rejected* — point at **Amount exact → “Says $1.4M, needs $1.37M.”**
  “The model rounded $1.37M to $1.4M. A human wouldn’t catch that in a demo;
  the verifier does, every time.” Also note the banned phrases and the missing ask.
- Point at **Targeted corrections → fed into attempt 2** — “these exact strings
  go back to the model. Click *Show recorded prompt* to prove the feedback is real,
  not just ‘try again’.”
- *Attempt 2* fixes the amount and fluff but still misses the ask → rejected.
- *Attempt 3* passes 7/7 → **green “All checks passed”** with the exact
  **$1,370,000**. “Only verified output ships.”

**2) Honest failure.**
Select **Ironbridge Capital — No firm close date** → Generate. It runs all 5
attempts and shows the **amber honest-failure card** with the best attempt and the
one check it couldn’t satisfy. “The source never states an exact close date, so it
refuses to ship — the opposite of an AI saying ‘looks fine.’”

**3) The style judge (advisory).**
Scroll to the **LLM Style Judge** under an accepted summary. “This scores *style*
only, on verified output, and is labelled *advisory · not the gate* — it can never
change pass/fail. Correctness stays with the deterministic code.”

**4) The measured value.**
Click **Run 20 generations**. “First-attempt pass **0%** → final **75%**, a
**+75-point** lift — that delta is what the loop earns. It stays below 100% on
purpose: one deal is genuinely unverifiable.”

**5) It handles *their* inputs (evaluators will test this).**
Edit any field live — change the amount to an odd figure like `$2,431,900`, or the
ask — and Generate again. The verifiers enforce whatever you type. Try the
**strict → lenient** toggle (lenient tolerates rounding, so pass rates rise) and
add a **must mention** term (e.g. `Globex`) to stack a new check.

**6) Salesforce (if configured — see §6).**
Click **Pull a deal from Salesforce**, keep **Executive priority**, pick a deal →
its fields load → Generate. “Real Opportunity, exact Amount straight from
Salesforce, verified the same way.”

---

## 5. Talking points (why it’s built this way)

- **The verifier is code, not the model.** An LLM grading its own compliance is
  worthless for numbers people act on — so the gate is deterministic and
  unit-tested (36 tests, incl. the $1.37M rounding case).
- **Targeted feedback** is the loop’s engine: each failure produces a specific
  instruction, visible in the recorded prompt.
- **Generator and verifier are decoupled** — swapping the offline drafter for a
  live LLM (or adding a check) touches one file.
- **Honest failure is a feature**, not a fallback.

---

## 6. Salesforce setup (optional, config-gated stretch)

Pull real **Opportunities** from a personal **Developer Edition** org (per the
brief: Dev org only — never a company/customer/production org).

```bash
cd server
npm install
cp .env.example .env         # fill in credentials
npm start                    # prints [mode=live] and what it detected
# second terminal:
cd .. && npm run dev
```

With **no** credentials the connector runs in **mock mode** (fictional,
Salesforce-shaped data) so the picker still demos offline.

**Credentials in `server/.env`:** `SF_USERNAME`, `SF_PASSWORD`,
`SF_SECURITY_TOKEN`. Newer orgs disable SOAP login, so you also need a
**Connected App**:

1. Setup → *App Manager* → **New Connected App** → enable OAuth; callback
   `http://localhost:8787/callback`; scopes **api** + **refresh_token,
   offline_access**; Save (wait a few minutes).
2. *Manage Consumer Details* → copy **Consumer Key** → `SF_CLIENT_ID`,
   **Consumer Secret** → `SF_CLIENT_SECRET`.
3. Setup → *OAuth and OpenID Connect Settings* → enable **Allow OAuth
   Username-Password Flows**.
4. Add the two keys to `server/.env`, restart. `SF_LOGIN_URL` stays
   `https://login.salesforce.com` for a Dev org (`https://test.salesforce.com`
   for a sandbox).

**Which deals?** The connector scopes with SOQL — never “all”:
- **Executive priority** (default): open + closing this quarter, by Amount desc,
  top 25 (timeframe switchable).
- **By account**, **My pipeline**, **Recently updated** — all with a stage filter
  and name/account search, paginated.

Each Opportunity maps to the loop’s fields: `Account.Name → account`,
`Amount → amount` (exact, unrounded), `CloseDate → closeDate`,
`NextStep → the ask`.

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| Picker: “connector is not running on :8787” | Start it: `cd server && npm start` (separate terminal). |
| Health shows `"mode":"mock"` with creds set | `.env` must be in **`server/`**; restart from there. The startup log lists which `SF_*` vars it detected. |
| `SOAP API login() is disabled` | Your org needs the Connected App + “Allow OAuth Username-Password Flows” (see §6). |
| `invalid_grant` right after creating the app | Connected apps take a few minutes to activate; retry. Then set *Permitted Users = All users may self-authorize* and relax IP. |
| No deals in Executive priority | Nothing closes this quarter — switch the timeframe to **Any date**. |
| Port 5173 or 8787 in use | Change with `npm run dev -- --port 5180` / `PORT=8790` in `server/.env`. |

---

## 8. Deliverables map

- **Running app:** `npm run dev` (UI) + optional `server/` (Salesforce).
- **README.md:** what it does, how to run, architecture, each verifier’s
  algorithm + limitations.
- **LEARNINGS.md:** what surprised me, what I’d change.
- **This guide + `DEMO_DECK.html`:** for the live demo.
