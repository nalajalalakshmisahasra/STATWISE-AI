# STATWISE — AI-Powered Competency Intelligence & Learning Platform

A working full-stack prototype for **SIH 2026 problem statement SIH26101** (Smart Education, MoSPI / DIID context).
STATWISE helps statistical professionals assess competencies, see **explainable skill gaps**, receive
**personalized learning recommendations**, practice with case studies and grounded quizzes, and track progress —
with distinct **Learner / Trainer / Administrator** workspaces and honest labelling of everything that is
simulated vs. live.

> **Demonstration prototype.** All data is synthetic. No government SSO, no live government APIs, no official
> endorsement. Every integration states its true status in the app (see *Integrations* in the Admin workspace).

---

## Quick start

```bash
# requirements: Node.js 20+ (built and tested on Node 24; uses built-in node:sqlite)
npm install

# build the frontend once (or use the dev servers below)
npm run build

# run everything from one process (API + built frontend)
npm start            # http://localhost:3000
```

Development mode (two terminals):

```bash
npm run dev          # API on :3000
npx vite             # frontend dev server on :5173 (proxies /api to :3000)
```

Default persistence is a SQLite file at `data/statwise.db`, created and seeded automatically on first run.
Delete the `data/` folder to reset the demo.

### Test

```bash
npm test             # 75 tests: 11 unit + 64 API (auth/OTP, onboarding, personalization, RBAC, journeys, honesty labels, i18n parity)
npm run typecheck    # tsc --noEmit
npm run build        # production frontend build
```

---

## Demo accounts

| Role    | Email                             | Notes |
|---------|-----------------------------------|-------|
| Learner | `arjun.mehta@demo.statwise.in`    | onboarded profile, assessment history, quiz attempts |
| Learner | `priya.nair@demo.statwise.in`     | |
| Trainer | `meera.iyer@demo.statwise.in`     | NES-2026 Cohort A (Arjun, Priya) |
| Trainer | `vikram.rao@demo.statwise.in`     | Industry Stats Program (Rahul, Sana) |
| Admin   | `kavya.sharma@demo.statwise.in`   | platform analytics |

Password for all seeded demo accounts: **`Statwise@2026`** (demonstration-only credential; change via
`DEMO_PASSWORD` when seeding). The landing page offers one-click **demo access** per role, and you can
**register a brand-new account** to experience the full journey: register → 6-digit OTP verification →
role selection → 7-step learner onboarding → personalized dashboard.

### Authentication & verification

- Registration: server-side validation (name/email/password/role); scrypt-hashed passwords (per-user salt).
- Verification: 6-digit code — hashed at rest, 10-minute expiry, max 5 attempts, 30-second resend cooldown,
  max 5 resends, login lockout after 5 failed passwords (10 minutes). **No email/SMS provider is configured:**
  delivery falls back to a development mode that shows the code in the UI behind an explicit
  *“Development delivery”* label and logs it server-side. Nothing claims to have been emailed.
- Roles are decided **server-side**: registration accepts only `learner`/`trainer` (trainer is promoted after
  verification). A client claiming `admin` gets an explicit 400 — administrator accounts are provisioned
  separately (seed), never by self-registration.
- Sessions: signed HTTP-only cookies (`server/auth.js`); roles are enforced **server-side on every protected
  route** — the UI never decides security.

### Learner onboarding

After verification a learner completes a 7-step wizard (status, field, interests, goals, self-reported levels,
learning preferences, available time + job role). Every step is persisted server-side as it is entered; the
route guard sends any learner with incomplete onboarding back to the wizard (refresh-safe), and completed
learners can edit everything later in **Profile**. Self-reported levels are stored but **never** used as
competency evidence — assessments, quizzes and activities are.

---

## Technology stack

| Layer      | Choice | Why |
|------------|--------|-----|
| Frontend   | React 19 + Vite 7 + react-router 7, hand-rolled design-token CSS | fast, no UI-library bloat, full control of the visual identity |
| Backend    | Node.js + Express 5 | single-process API + static hosting |
| Validation | zod available; explicit validators on all write routes | clear 400s, no silent accepts |
| Database   | **`node:sqlite` (built into Node 24)** — file at `data/statwise.db` | zero native deps, real persistence, WAL mode |
| AI         | provider abstraction (`server/ai.js`): OpenAI-compatible or Anthropic; rules-based fallback | honest `mode: 'ai' | 'fallback'` on every response |
| Tests      | Vitest | API tests over real HTTP with cookie jars + unit tests |
| Language   | JavaScript (CommonJS server, ESM frontend), `tsc --noEmit` checks with `allowJs` | fast dev, still type-checked |

---

## Project structure

```
├── server/                 # backend (CommonJS)
│   ├── index.js            # app entry: middleware, routes, static hosting
│   ├── auth.js             # HMAC-signed cookie sessions + requireRole RBAC gate
│   ├── db.js               # node:sqlite bootstrap + schema (PRD §8.2 entities)
│   ├── seed.js             # demo users, framework, resources, activities, bank, integrations
│   ├── routes.js           # all /api routes, grouped per PRD §8.3
│   ├── services.js         # scoring, gap analysis, recommendations, adaptive next steps
│   ├── ai.js               # AI provider abstraction + labelled rules-based fallback
│   ├── extract.js          # upload validation + text extraction (sample-doc path)
│   └── types.js            # levels and helpers
├── client/                 # frontend (React, ESM)
│   ├── index.html
│   └── src/
│       ├── styles.css      # design tokens derived from the logo
│       ├── App.jsx         # routes + role guards
│       ├── lib/            # api client, app context (session + i18n)
│       ├── locales/        # EN/HI/TE/TA strings
│       ├── components/     # ui primitives, charts, layout shells
│       └── pages/          # landing, login, learner/, trainer/, admin/
├── tests/                  # Vitest suites (ESM) + HTTP test harness
├── scripts/                # PDF extraction helper used during the build
├── data/                   # SQLite database (git-ignorable runtime data)
├── dist/                   # production frontend build output
├── .env.example            # safe placeholders — no real secrets
├── vite.config.js / vitest.config.js / tsconfig.json
└── docs/REQUIREMENTS-TRACEABILITY.md
```

---

## Features by role

**Learner** — dashboard (radar overview, priority gaps, next steps, recent activity), professional profile with
validation, competency assessment with transparent scoring + per-question review, explainable gap report
(expected vs assessed, gap size, relevance, evidence, limitations, next step), recommendations with rationale /
provider / duration / priority / status, activity library (statistical case studies with reflections),
quiz generation with source grounding, trainer-published quizzes with feedback + adaptive next step,
AI learning assistant (with demo-mode disclosure), progress history, notifications.

**Trainer** — assigned learners only (server-scoped), learner drill-down (gaps, results, assignments),
cohort analysis (level distribution, ranked deficits), activity assignment with due dates + notification,
trainer feedback messages, quiz review queue: edit generated questions, approve & publish or keep in review.

**Administrator** — platform analytics with domain/department filters (level distribution, gaps by competency,
learners by department, completion stats, assessment trend, resource usage; flagged *illustrative*),
learning-resource management (create / publish / hold / retire), competency framework browser with editable
descriptions and the role-expectations matrix, user & role management, integration status panel +
government-ecosystem resource discovery.

## Multilingual

English (complete), Hindi, Telugu, Tamil — covering navigation, auth, registration, OTP verification,
onboarding, dashboard, assessments, gaps, recommendations, activities, quizzes, assistant, profile, trainer
and admin surfaces, empty/loading/error states. Language is chosen **before** authentication on the Welcome
screen, persists through registration/login, is saved to the user profile, and immediately re-renders the
whole interface.

## AI behaviour (honest by design)

- `server/ai.js` calls the configured provider (OpenAI-compatible or Anthropic) **only if** `AI_PROVIDER` +
  `AI_API_KEY` are set server-side.
- Without credentials, quiz generation and the assistant use a rules-based fallback that is labelled
  **everywhere it appears** — API `mode`, generation notes, quiz badges, assistant messages. Nothing is ever
  presented as live AI when it is not; tests assert this.
- Generated questions carry `source_ref` citations; weakly-grounded items are marked `insufficient` and must
  pass trainer review before publication.

## Integrations (truthful status)

| Integration | Status in this build |
|---|---|
| iGOT Karmayogi | `demo_data` — synthetic sample catalogue only |
| NSSTA / TPAC | `demo_data` — synthetic sample programmes |
| Mission Karmayogi (SSO/FRU) | `requires_authorization` — demo sign-in only |
| AI provider | `live` only when env credentials configured, else `not_configured` |
| Persistence | `live` — real SQLite persistence |

## Environment variables

See `.env.example`. Only `PORT`, `DATABASE_PATH` and the optional AI trio have effect today; government
integration variables are **reserved placeholders** and documented as such. Never put real secrets in the
repository; server-only values are never exposed to the browser bundle.

## Known limitations

- PDF/DOCX **text extraction** is not implemented in the demo (validation + clear error + sample-document path
  instead). Plain text / markdown / CSV uploads are extracted.
- Competency framework, role expectations, and scores are **illustrative**, not validated national frameworks.
- Admin "predictive-style" insights are labelled illustrative; no production forecasting.
- Demo auth is not production identity management (by design, per PRD).
- No automated browser E2E yet; journey coverage is API-level (see tests) + manual script below.

## Manual demo script (mirrors PRD §13)

1. Open the app → **Welcome** screen: choose language (English / हिन्दी / తెలుగు / தமிழ்).
2. **Register** a new learner (name, email, password, role) → the 6-digit code appears in the labelled
   *Development delivery* box → verify.
3. Complete the **7-step onboarding** wizard (status → field → interests → goals → self-levels →
   preferences → time + job role). Refresh mid-way to see persistence.
4. **Dashboard**: personalized welcome, goals/interests, and the evidence-based next-step banner
   (“Complete your initial assessment…”).
5. Start + submit an **Assessment** (questions weighted to your role) → review per-question feedback.
6. Open **Skill Gaps** → evidence, limitations, next steps — gaps come from assessment evidence only.
7. Open **Recommendations** → every card shows *why* it was recommended (gap evidence, or interest/goal
   relevance) — mark one complete and watch progress update.
8. Complete an **Activity** (case study) with a reflection; take a **Quiz** → adaptive next step.
9. Reassess → gaps and recommendations update from the new evidence.
10. Sign out → enter as **Trainer** (scope-isolated cohort) → review queue → edit + publish a quiz.
11. Sign out → enter as **Administrator** → analytics, filters, resources, framework, users, integrations.
12. Sign in as the demo learner instead (`arjun.mehta@demo.statwise.in` / `Statwise@2026`) to skip onboarding
    and land directly on the populated dashboard.
11. Open **Integrations** → confirm every status label is honest.
