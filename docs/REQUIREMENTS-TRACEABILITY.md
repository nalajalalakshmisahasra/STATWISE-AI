# STATWISE — Requirements Traceability

Source of truth: **STATWISE PRD & Arena Build Specification v1.0** (uploaded PDF, extracted in full during the build).
Status legend: ✅ implemented & verified · 🟡 implemented with documented demo boundary · ⛔ intentionally out of scope (PRD §14).

## P0 — essential end-to-end foundation

| PRD requirement | Where implemented | Verified by |
|---|---|---|
| Responsive landing page + language selection | `client/src/pages/Landing.jsx`, `locales/strings.js`, `LandingHeader` | manual + build; EN/HI/TE/TA render |
| Demo access with roles + backend permission checks | `server/auth.js` (`requireRole`), `routes.js` guards | 38 API tests incl. 6 RBAC negatives |
| Learner profile & competency framework | `learner_profiles`, `competencies`, `role_competency_requirements`; Profile page | API tests: profile save/validation |
| Assessment submission & transparent scoring | `services.js: scoreAssessment/completeAssessment`, Assessment page | tests: scoring, breakdown, double-submit 409 |
| Explainable skill-gap calculation | `services.js: gapReport` (evidence, limitation, next step) | tests: gap fields non-empty |
| Personalized recommendations from seeded data | `services.js: generateRecommendations` (gap/interest/adaptive) | tests: rationale/priority/basis present |
| Persistent core records | `node:sqlite` file DB, WAL | server smoke + tests against live app |
| Coherent learner dashboard + navigation | `learner/Dashboard.jsx`, `WorkspaceShell` | build + manual |

## P1 — complete learning cycle

| Requirement | Where | Verified |
|---|---|---|
| Learning activities & statistical case studies | `seed.js` (3 synthetic activities), Activities pages | tests: list, detail, complete, progress record |
| Quiz flow with upload/extract + sample fallback | `extract.js` (validation; PDF/DOCX honest-reject 🟡), `ai.js` fallback | tests: generate→in_review, sample path |
| Answer explanations, results, feedback, progress | Assessment/QuizTake result views, `progress_records` | tests: breakdown + next_step |
| Trainer quiz review/edit workflow | `/trainer/questions/:id`, `/trainer/quizzes/:id/approve`, QuizReview page | tests: edit→origin=trainer_edited→publish |
| Trainer dashboard & learner summaries | Trainer pages (own-scope queries) | tests: scope isolation (403 on other's learner) |

## P2 — showcase

| Requirement | Where | Verified |
|---|---|---|
| Admin analytics + filters | `/admin/analytics` (domain/department) | tests: aggregate shape, domain filter |
| Government resource discovery + integration panel | Integrations page, `/api/integrations` | tests: honest statuses |
| AI assistant with provider abstraction + fallback | `ai.js: assistantReply`, Assistant page | tests: fallback mode asserted |
| Adaptive recommendations | `services.js: adaptiveNextStep` (revise/practice/advance with reasons) | tests: next_step present + valid action |
| Multilingual labels | `strings.js` (4 languages) | manual; persisted via `/auth/language` (tested) |

## §6 Functional requirements detail

| Item | Status | Notes |
|---|---|---|
| 6.1 profile fields (dept, designation, role, assignment, education, experience, prior training, interests, self-skills) | ✅ | all stored + editable + validated |
| 6.1 levels Beginner→Advanced, illustrative labelling | ✅ | labels in UI + gap limitations text |
| 6.2 single/multiple choice, transparent scoring | ✅ | multi supported by grader; seeded bank is single-choice |
| 6.2 gap: expected/current, gap, relevance, evidence, next step | ✅ | plus explicit limitations |
| 6.2 assessment limitations explained | ✅ | in gap rows + assessment page copy |
| 6.3 recommendation fields (title, competency, rationale, outcome, provider, duration, priority, state) | ✅ | all rendered on cards |
| 6.3 iGOT/NSSTA/internal/case-study seeds, verified-vs-demo distinction | 🟡 | all seeded entries labelled `demo`; `verified` type exists for future real entries |
| 6.4 validate type/size; extract or sample path; grounded MCQs; source refs; AI/reviewed/insufficient marks; trainer approve | ✅/🟡 | PDF/DOCX extraction not implemented → honest error + sample fallback |
| 6.5 assistant scope, grounding, uncertainty, demo labels | ✅ | rules fallback labels everywhere; live path when configured |
| 6.6 dashboards per role; restrained notifications | ✅ | assignment + feedback notifications implemented |
| §7 truthful integration labels; no invented links/IDs | ✅ | status panel + `*.example.gov.in` URLs |
| §8.3 API areas | ✅ | auth/profiles/competencies/assessments/gaps/resources/recommendations/activities/progress/quizzes/trainer/admin/assistant/integrations/notifications |
| §8.4 `.env.example`, no secrets, no browser exposure | ✅ | |
| §11 security: input validation, server-side roles, secrets server-side, synthetic data | ✅ | RBAC tests; validation tests |
| §12 acceptance 1–15 | ✅ | see tests + manual script; E2E browser suite not automated (manual script provided) |

## §14 Out of scope (not built, per PRD)

Production SSO · real employee data · official certification · production forecasts · virtual labs · payments ·
unverified official feeds.
