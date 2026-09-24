/**
 * All API routes, organized by PRD §8.3 areas: /auth, /profiles, /competencies,
 * /assessments, /gaps, /resources, /recommendations, /activities, /progress,
 * /quizzes, /trainer, /admin, /assistant, /integrations, /notifications.
 * Protected operations enforce roles server-side via requireRole.
 */
const express = require('express')
const db = require('./db')
const { requireRole, createSession, destroySession } = require('./auth')
const { generateRecommendations, gapReport, completeAssessment, adaptiveNextStep, recomputeGapsFromProgress } = require('./services')
const { generateQuizQuestions, assistantReply, isLive } = require('./ai')
const { extractText, SAMPLE_DOC, validateUpload } = require('./extract')

const router = express.Router()

function parseJson (s, fallback) {
  try { return JSON.parse(s) } catch { return fallback }
}

function httpError (res, status, message) {
  return res.status(status).json({ error: message })
}

// ---------- Auth / demo sessions ----------
const DEMO_USERS = {
  learner: { email: 'arjun.mehta@demo.statwise.in' },
  trainer: { email: 'meera.iyer@demo.statwise.in' },
  admin: { email: 'kavya.sharma@demo.statwise.in' }
}

router.get('/auth/me', (req, res) => {
  if (!req.user) return res.json({ user: null })
  const u = db.prepare('SELECT id, email, name, role, language FROM users WHERE id = ?').get(req.user.sub)
  if (!u) return res.json({ user: null })
  const profile = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(u.id)
  res.json({ user: { ...u, hasProfile: Boolean(profile) } })
})

router.post('/auth/demo', (req, res) => {
  const role = req.body && req.body.role
  if (!DEMO_USERS[role]) return httpError(res, 400, 'Invalid role. Use learner, trainer or admin.')
  const user = db.prepare('SELECT id, email, name, role, language FROM users WHERE email = ?').get(DEMO_USERS[role].email)
  if (!user) return httpError(res, 500, 'Demo user missing; reseed database.')
  createSession(res, user)
  res.json({ user })
})

router.post('/auth/login', (req, res) => {
  const { email } = req.body || {}
  if (!email || typeof email !== 'string') return httpError(res, 400, 'Email is required.')
  const user = db.prepare('SELECT id, email, name, role, language FROM users WHERE email = ?').get(email.toLowerCase().trim())
  if (!user) return httpError(res, 401, 'No demo account with that email. Use demo access or a seeded demo email.')
  createSession(res, user)
  res.json({ user })
})

router.post('/auth/logout', (req, res) => {
  destroySession(res)
  res.json({ ok: true })
})

router.post('/auth/language', requireRole(), (req, res) => {
  const { language } = req.body || {}
  if (!['en', 'hi', 'te', 'ta'].includes(language)) return httpError(res, 400, 'Invalid language.')
  db.prepare('UPDATE users SET language = ? WHERE id = ?').run(language, req.user.sub)
  res.json({ ok: true, language })
})

// ---------- Profiles ----------
const PROFILE_FIELDS = ['department', 'designation', 'job_role', 'assignment', 'education', 'experience_years', 'previous_training', 'interests', 'self_reported_skills']

router.get('/profiles/me', requireRole('learner'), (req, res) => {
  const profile = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(req.user.sub)
  res.json({ profile: profile || null })
})

router.put('/profiles/me', requireRole('learner'), (req, res) => {
  const b = req.body || {}
  const errors = []
  if (b.job_role !== undefined && (typeof b.job_role !== 'string' || !b.job_role.trim())) errors.push('Job role is required.')
  if (b.experience_years !== undefined && b.experience_years !== null && (typeof b.experience_years !== 'number' || b.experience_years < 0 || b.experience_years > 50)) errors.push('Experience must be a number between 0 and 50.')
  if (errors.length) return httpError(res, 400, errors.join(' '))

  const existing = db.prepare('SELECT id FROM learner_profiles WHERE user_id = ?').get(req.user.sub)
  const vals = PROFILE_FIELDS.map(f => (b[f] === undefined ? null : b[f]))
  if (existing) {
    db.prepare(`UPDATE learner_profiles SET ${PROFILE_FIELDS.map(f => `${f} = ?`).join(', ')}, updated_at = datetime('now') WHERE user_id = ?`).run(...vals, req.user.sub)
  } else {
    db.prepare(`INSERT INTO learner_profiles (user_id, ${PROFILE_FIELDS.join(', ')}) VALUES (?, ${PROFILE_FIELDS.map(() => '?').join(', ')})`).run(req.user.sub, ...vals)
  }
  // Re-key gaps against the new role expectations
  recomputeGapsFromProgress(req.user.sub)
  const profile = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(req.user.sub)
  res.json({ profile })
})

// ---------- Competencies ----------
router.get('/competencies', (req, res) => {
  const comps = db.prepare('SELECT * FROM competencies ORDER BY domain, name').all()
  res.json({ competencies: comps })
})

router.get('/competencies/requirements', requireRole('trainer', 'admin'), (req, res) => {
  const { job_role } = req.query
  const rows = job_role
    ? db.prepare(`SELECT r.*, c.name, c.domain FROM role_competency_requirements r JOIN competencies c ON c.id = r.competency_id WHERE r.job_role = ?`).all(job_role)
    : db.prepare(`SELECT r.*, c.name, c.domain FROM role_competency_requirements r JOIN competencies c ON c.id = r.competency_id`).all()
  res.json({ requirements: rows })
})

router.put('/competencies/:id', requireRole('admin'), (req, res) => {
  const { description } = req.body || {}
  const comp = db.prepare('SELECT * FROM competencies WHERE id = ?').get(Number(req.params.id))
  if (!comp) return httpError(res, 404, 'Competency not found.')
  if (description !== undefined) {
    if (typeof description !== 'string' || description.length > 500) return httpError(res, 400, 'Description must be a string under 500 chars.')
    db.prepare('UPDATE competencies SET description = ? WHERE id = ?').run(description, comp.id)
  }
  res.json({ competency: db.prepare('SELECT * FROM competencies WHERE id = ?').get(comp.id) })
})

// ---------- Assessments ----------
router.get('/assessments/current', requireRole('learner'), (req, res) => {
  const open = db.prepare(`SELECT * FROM assessments WHERE user_id = ? AND status = 'in_progress' ORDER BY id DESC LIMIT 1`).get(req.user.sub)
  if (!open) return res.json({ assessment: null, questions: [] })
  const questions = db.prepare('SELECT id, competency_id, question_type, prompt, options FROM questions WHERE assessment_id = ?').all(open.id)
  res.json({
    assessment: open,
    questions: questions.map(q => ({ ...q, options: parseJson(q.options, []) }))
  })
})

router.post('/assessments', requireRole('learner'), (req, res) => {
  const { competency_ids } = req.body || {}
  let pool
  if (Array.isArray(competency_ids) && competency_ids.length) {
    const placeholders = competency_ids.map(() => '?').join(',')
    pool = db.prepare(`SELECT * FROM questions WHERE assessment_id IS NULL AND competency_id IN (${placeholders}) ORDER BY RANDOM()`).all(...competency_ids.map(Number))
  } else {
    pool = db.prepare('SELECT * FROM questions WHERE assessment_id IS NULL ORDER BY RANDOM()').all()
  }
  if (pool.length === 0) return httpError(res, 400, 'No assessment questions available.')
  const count = Math.min(8, pool.length)
  const chosen = pool.slice(0, count)
  const assessmentId = db.prepare('INSERT INTO assessments (user_id, title) VALUES (?, ?)').run(req.user.sub, 'Competency Assessment').lastInsertRowid
  const link = db.prepare('UPDATE questions SET assessment_id = ? WHERE id = ?')
  const out = []
  for (const q of chosen) {
    link.run(assessmentId, q.id)
    out.push({ id: q.id, competency_id: q.competency_id, question_type: q.question_type, prompt: q.prompt, options: parseJson(q.options, []) })
  }
  res.status(201).json({ assessment: db.prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId), questions: out })
})

router.post('/assessments/:id/submit', requireRole('learner'), (req, res) => {
  const assessmentId = Number(req.params.id)
  const assessment = db.prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId)
  if (!assessment) return httpError(res, 404, 'Assessment not found.')
  if (assessment.user_id !== req.user.sub) return httpError(res, 403, 'Not your assessment.')
  if (assessment.status === 'completed') return httpError(res, 409, 'Assessment already submitted.')

  const { responses } = req.body || {}
  if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
    return httpError(res, 400, 'responses object {question_id: answer} is required.')
  }
  const questions = db.prepare('SELECT * FROM questions WHERE assessment_id = ?').all(assessmentId)
  const qIds = new Set(questions.map(q => q.id))
  const insert = db.prepare('INSERT INTO assessment_responses (assessment_id, question_id, user_id, response, is_correct) VALUES (?, ?, ?, ?, ?)')
  const { gradeResponse } = require('./services')
  for (const [qidStr, ans] of Object.entries(responses)) {
    const qid = Number(qidStr)
    if (!qIds.has(qid)) return httpError(res, 400, `Unknown question ${qidStr}.`)
    const q = questions.find(x => x.id === qid)
    const correct = gradeResponse(q, ans)
    insert.run(assessmentId, qid, req.user.sub, JSON.stringify(ans), correct ? 1 : 0)
  }
  const result = completeAssessment(assessmentId, req.user.sub, assessment.title)
  generateRecommendations(req.user.sub)
  const detail = db.prepare(`
    SELECT q.id, q.prompt, q.options, q.correct_answer, q.explanation, q.competency_id, c.name AS competency_name,
      r.response, r.is_correct FROM assessment_responses r JOIN questions q ON q.id = r.question_id
      JOIN competencies c ON c.id = q.competency_id WHERE r.assessment_id = ?`).all(assessmentId)
  res.json({
    result,
    breakdown: detail.map(d => ({
      question_id: d.id,
      prompt: d.prompt,
      competency: d.competency_name,
      your_answer: parseJson(d.response, null),
      correct_answer: parseJson(d.correct_answer, []),
      is_correct: Boolean(d.is_correct),
      explanation: d.explanation
    })),
    gaps: gapReport(req.user.sub)
  })
})

router.get('/assessments/results', requireRole('learner'), (req, res) => {
  const rows = db.prepare(`SELECT ar.*, a.title, a.completed_at FROM assessment_results ar
    JOIN assessments a ON a.id = ar.assessment_id WHERE ar.user_id = ? ORDER BY ar.created_at DESC`).all(req.user.sub)
  res.json({ results: rows.map(r => ({ ...r, competency_scores: parseJson(r.competency_scores, {}) })) })
})

// ---------- Gaps ----------
router.get('/gaps/me', requireRole('learner'), (req, res) => {
  res.json({ role: (db.prepare('SELECT job_role FROM learner_profiles WHERE user_id = ?').get(req.user.sub) || {}).job_role || null, gaps: gapReport(req.user.sub) })
})

// ---------- Resources & recommendations ----------
router.get('/resources', (req, res) => {
  const { competency_id, q, source_type } = req.query
  let sql = 'SELECT r.*, c.name AS competency_name FROM learning_resources r JOIN competencies c ON c.id = r.competency_id WHERE r.status != \'retired\''
  const params = []
  if (competency_id) { sql += ' AND r.competency_id = ?'; params.push(Number(competency_id)) }
  if (source_type) { sql += ' AND r.source_type = ?'; params.push(String(source_type)) }
  if (q) { sql += ' AND (r.title LIKE ? OR r.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`) }
  sql += ' ORDER BY r.title'
  res.json({ resources: db.prepare(sql).all(...params) })
})

router.get('/recommendations/me', requireRole('learner'), (req, res) => {
  generateRecommendations(req.user.sub)
  const rows = db.prepare(`SELECT rec.*, lr.title, lr.provider, lr.source_type, lr.resource_type, lr.duration_hours, lr.outcome, lr.url, lr.description, c.name AS competency_name
    FROM recommendations rec JOIN learning_resources lr ON lr.id = rec.resource_id JOIN competencies c ON c.id = rec.competency_id
    WHERE rec.user_id = ? AND rec.status != 'dismissed' ORDER BY CASE rec.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, rec.id`).all(req.user.sub)
  res.json({ recommendations: rows })
})

router.post('/recommendations/:id/status', requireRole('learner'), (req, res) => {
  const rec = db.prepare('SELECT * FROM recommendations WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.sub)
  if (!rec) return httpError(res, 404, 'Recommendation not found.')
  const { status } = req.body || {}
  if (!['open', 'in_progress', 'completed', 'dismissed'].includes(status)) return httpError(res, 400, 'Invalid status.')
  db.prepare('UPDATE recommendations SET status = ? WHERE id = ?').run(status, rec.id)
  if (status === 'completed') {
    db.prepare(`INSERT INTO progress_records (user_id, competency_id, record_type, reference_id, note) VALUES (?, ?, 'resource', ?, ?)`)
      .run(req.user.sub, rec.competency_id, rec.resource_id, 'Completed recommended resource: ' + (db.prepare('SELECT title FROM learning_resources WHERE id = ?').get(rec.resource_id) || {}).title)
  }
  res.json({ ok: true })
})

// ---------- Activities & progress ----------
router.get('/activities', requireRole(), (req, res) => {
  const rows = db.prepare(`SELECT la.*, c.name AS competency_name FROM learning_activities la JOIN competencies c ON c.id = la.competency_id
    WHERE la.assigned_to IS NULL OR la.assigned_to = ? ORDER BY la.id`).all(req.user.sub)
  res.json({ activities: rows.map(r => ({ ...r, content: parseJson(r.content, {}) })) })
})

router.get('/activities/:id', requireRole(), (req, res) => {
  const act = db.prepare(`SELECT la.*, c.name AS competency_name FROM learning_activities la JOIN competencies c ON c.id = la.competency_id WHERE la.id = ?`).get(Number(req.params.id))
  if (!act) return httpError(res, 404, 'Activity not found.')
  if (act.assigned_to !== null && act.assigned_to !== req.user.sub && req.user.role === 'learner') return httpError(res, 403, 'Not assigned to you.')
  res.json({ activity: { ...act, content: parseJson(act.content, {}) } })
})

router.post('/activities/:id/complete', requireRole('learner'), (req, res) => {
  const act = db.prepare('SELECT * FROM learning_activities WHERE id = ?').get(Number(req.params.id))
  if (!act) return httpError(res, 404, 'Activity not found.')
  const { reflection } = req.body || {}
  db.prepare(`INSERT INTO progress_records (user_id, competency_id, record_type, reference_id, level_after, note)
    VALUES (?, ?, 'activity', ?, ?, ?)`)
    .run(req.user.sub, act.competency_id, act.id, null, 'Completed activity: ' + act.title + (reflection ? ` — reflection: ${String(reflection).slice(0, 300)}` : ''))
  db.prepare("UPDATE learning_activities SET status = 'completed' WHERE id = ? AND assigned_to = ?").run(act.id, req.user.sub)
  recomputeGapsFromProgress(req.user.sub)
  res.json({ ok: true, nextStep: adaptiveNextStep(req.user.sub, act.competency_id, 75) })
})

router.get('/progress/me', requireRole('learner'), (req, res) => {
  const rows = db.prepare(`SELECT p.*, c.name AS competency_name FROM progress_records p JOIN competencies c ON c.id = p.competency_id
    WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 50`).all(req.user.sub)
  res.json({ progress: rows })
})

// ---------- Quizzes ----------
router.get('/quizzes', requireRole(), (req, res) => {
  const rows = db.prepare(`SELECT q.*, c.name AS competency_name, u.name AS created_by_name,
    (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count
    FROM quizzes q LEFT JOIN competencies c ON c.id = q.competency_id JOIN users u ON u.id = q.created_by
    WHERE q.status = 'published' ORDER BY q.created_at DESC`).all()
  res.json({ quizzes: rows })
})

router.get('/quizzes/:id', requireRole(), (req, res) => {
  const quiz = db.prepare(`SELECT q.*, c.name AS competency_name FROM quizzes q LEFT JOIN competencies c ON c.id = q.competency_id WHERE q.id = ?`).get(Number(req.params.id))
  if (!quiz) return httpError(res, 404, 'Quiz not found.')
  const questions = db.prepare(`SELECT qz.id, q.id AS question_id, q.prompt, q.options, q.origin, q.grounding_status, q.source_ref
    FROM quiz_questions qz JOIN questions q ON q.id = qz.question_id WHERE qz.quiz_id = ? ORDER BY qz.position`).all(quiz.id)
  res.json({ quiz: { ...quiz, source_excerpt: undefined }, questions: questions.map(q => ({ ...q, options: parseJson(q.options, []) })) })
})

router.post('/quizzes/:id/attempt', requireRole('learner'), (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(Number(req.params.id))
  if (!quiz) return httpError(res, 404, 'Quiz not found.')
  if (quiz.status !== 'published') return httpError(res, 409, 'Quiz is not published.')
  const { answers } = req.body || {}
  if (!answers || typeof answers !== 'object') return httpError(res, 400, 'answers object {question_id: answer} is required.')
  const rows = db.prepare(`SELECT q.* FROM quiz_questions qz JOIN questions q ON q.id = qz.question_id WHERE qz.quiz_id = ?`).all(quiz.id)
  const { gradeResponse } = require('./services')
  let correct = 0
  const detail = []
  for (const q of rows) {
    const given = answers[q.id] !== undefined ? answers[q.id] : (answers[String(q.id)] !== undefined ? answers[String(q.id)] : null)
    const ok = given !== null && gradeResponse(q, given)
    if (ok) correct++
    const comp = db.prepare('SELECT name FROM competencies WHERE id = ?').get(q.competency_id)
    detail.push({
      question_id: q.id,
      prompt: q.prompt,
      competency: comp ? comp.name : null,
      your_answer: given,
      correct_answer: parseJson(q.correct_answer, []),
      is_correct: ok,
      explanation: q.explanation,
      source_ref: q.source_ref,
      grounding_status: q.grounding_status
    })
  }
  const total = rows.length
  const scorePct = total ? Math.round((correct / total) * 100) : 0
  db.prepare('INSERT INTO quiz_attempts (quiz_id, user_id, score_pct, total_questions, correct_count, answers) VALUES (?, ?, ?, ?, ?, ?)')
    .run(quiz.id, req.user.sub, scorePct, total, correct, JSON.stringify(answers))
  if (quiz.competency_id) {
    db.prepare(`INSERT INTO progress_records (user_id, competency_id, record_type, reference_id, note) VALUES (?, ?, 'quiz', ?, ?)`)
      .run(req.user.sub, quiz.competency_id, quiz.id, `Quiz "${quiz.title}": ${correct}/${total}`)
  }
  generateRecommendations(req.user.sub)
  const next = quiz.competency_id ? adaptiveNextStep(req.user.sub, quiz.competency_id, scorePct) : null
  res.json({ score_pct: scorePct, correct_count: correct, total_questions: total, breakdown: detail, next_step: next })
})

// Quiz generation (learner or trainer uploads/grounds; trainer approves)
router.post('/quizzes/generate', requireRole('learner', 'trainer'), async (req, res) => {
  const { topic, text, use_sample } = req.body || {}
  if (!topic || typeof topic !== 'string') return httpError(res, 400, 'topic is required.')
  const sourceText = typeof text === 'string' ? text : ''
  if (!use_sample && sourceText.trim().length < 40) {
    return httpError(res, 400, 'Provide source text (min 40 chars) or set use_sample = true.')
  }
  const result = await generateQuizQuestions(topic, use_sample ? '' : sourceText)
  if (!result.questions.length) {
    return httpError(res, 422, 'Could not generate grounded questions from that text. Try richer source content.')
  }
  const competency = db.prepare('SELECT * FROM competencies WHERE name = ?').get(topic)
  const quizId = db.prepare(`INSERT INTO quizzes (title, topic, competency_id, created_by, source_doc_name, source_excerpt, generation_mode, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'in_review')`).run(
    `${topic} — generated quiz`, topic, competency ? competency.id : null, req.user.sub,
    use_sample ? SAMPLE_DOC.name : 'uploaded-document', (use_sample ? SAMPLE_DOC.text : sourceText).slice(0, 4000),
    result.mode
  ).lastInsertRowid
  const insQ = db.prepare(`INSERT INTO questions (assessment_id, competency_id, question_type, prompt, options, correct_answer, explanation, source_ref, origin, grounding_status)
    VALUES (NULL, ?, 'single', ?, ?, ?, ?, ?, ?, ?)`)
  const insQQ = db.prepare('INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES (?, ?, ?)')
  for (const [i, q] of result.questions.entries()) {
    const qid = insQ.run(competency ? competency.id : null, q.prompt, JSON.stringify(q.options), JSON.stringify(q.correct_answer), q.explanation, q.source_ref || '', 'ai_generated', q.grounding_status || 'grounded').lastInsertRowid
    insQQ.run(quizId, qid, i)
  }
  res.status(201).json({
    quiz_id: quizId,
    mode: result.mode,
    note: result.note,
    model: result.model || null,
    question_count: result.questions.length,
    status: 'in_review'
  })
})

router.post('/quizzes/sample-text', requireRole('learner', 'trainer'), (req, res) => {
  res.json({ name: SAMPLE_DOC.name, text: SAMPLE_DOC.text })
})

// ---------- Trainer ----------
router.get('/trainer/learners', requireRole('trainer'), (req, res) => {
  const rows = db.prepare(`SELECT u.id, u.name, u.email, ta.cohort, lp.department, lp.job_role,
    (SELECT COUNT(*) FROM skill_gaps sg WHERE sg.user_id = u.id AND sg.gap > 0) AS open_gaps,
    (SELECT ROUND(AVG(ar.score_pct)) FROM assessment_results ar WHERE ar.user_id = u.id) AS avg_score,
    (SELECT MAX(p.created_at) FROM progress_records p WHERE p.user_id = u.id) AS last_activity
    FROM trainer_assignments ta JOIN users u ON u.id = ta.learner_id
    LEFT JOIN learner_profiles lp ON lp.user_id = u.id WHERE ta.trainer_id = ? ORDER BY ta.cohort, u.name`).all(req.user.sub)
  res.json({ learners: rows })
})

router.get('/trainer/learners/:id', requireRole('trainer'), (req, res) => {
  const learnerId = Number(req.params.id)
  const link = db.prepare('SELECT * FROM trainer_assignments WHERE trainer_id = ? AND learner_id = ?').get(req.user.sub, learnerId)
  if (!link) return httpError(res, 403, 'Learner not assigned to you.')
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(learnerId)
  if (!user) return httpError(res, 404, 'Learner not found.')
  const profile = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(learnerId)
  const gaps = gapReport(learnerId)
  const results = db.prepare(`SELECT ar.*, a.title FROM assessment_results ar JOIN assessments a ON a.id = ar.assessment_id WHERE ar.user_id = ? ORDER BY ar.created_at DESC`).all(learnerId)
  const attempts = db.prepare(`SELECT qa.*, q.title FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id WHERE qa.user_id = ? ORDER BY qa.created_at DESC`).all(learnerId)
  const assignments = db.prepare(`SELECT la.*, c.name AS competency_name FROM learning_activities la JOIN competencies c ON c.id = la.competency_id WHERE la.assigned_to = ? ORDER BY la.id DESC`).all(learnerId)
  res.json({ learner: user, profile: profile || null, gaps, results, attempts, assignments })
})

router.get('/trainer/cohort-gaps', requireRole('trainer'), (req, res) => {
  const { cohort } = req.query
  const rows = cohort
    ? db.prepare('SELECT learner_id FROM trainer_assignments WHERE trainer_id = ? AND cohort = ?').all(req.user.sub, cohort)
    : db.prepare('SELECT learner_id FROM trainer_assignments WHERE trainer_id = ?').all(req.user.sub)
  const ids = rows.map(r => r.learner_id)
  if (!ids.length) return res.json({ distribution: [], learners: 0 })
  const placeholders = ids.map(() => '?').join(',')
  const dist = db.prepare(`SELECT c.name AS competency, sg.assessed_level, COUNT(*) AS n FROM skill_gaps sg
    JOIN competencies c ON c.id = sg.competency_id WHERE sg.user_id IN (${placeholders}) GROUP BY c.name, sg.assessed_level ORDER BY c.name`).all(...ids)
  const gapCounts = db.prepare(`SELECT c.name AS competency, SUM(sg.gap) AS total_gap, COUNT(*) AS learners_with_gap FROM skill_gaps sg
    JOIN competencies c ON c.id = sg.competency_id WHERE sg.user_id IN (${placeholders}) AND sg.gap > 0 GROUP BY c.name ORDER BY total_gap DESC`).all(...ids)
  res.json({ learners: ids.length, distribution: dist, gap_counts: gapCounts })
})

router.post('/trainer/assign', requireRole('trainer'), (req, res) => {
  const { learner_id, activity_id, due_date } = req.body || {}
  const learnerId = Number(learner_id)
  const activityId = Number(activity_id)
  if (!learnerId || !activityId) return httpError(res, 400, 'learner_id and activity_id are required.')
  const link = db.prepare('SELECT * FROM trainer_assignments WHERE trainer_id = ? AND learner_id = ?').get(req.user.sub, learnerId)
  if (!link) return httpError(res, 403, 'Learner not assigned to you.')
  const act = db.prepare('SELECT * FROM learning_activities WHERE id = ?').get(activityId)
  if (!act) return httpError(res, 404, 'Activity not found.')
  const copy = db.prepare(`INSERT INTO learning_activities (title, competency_id, activity_type, content, dataset_note, assigned_by, assigned_to, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'assigned')`).run(
    act.title, act.competency_id, act.activity_type, act.content, act.dataset_note, req.user.sub, learnerId, due_date || null
  )
  db.prepare(`INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)`)
    .run(learnerId, 'assignment', 'New activity assigned', `${act.title} was assigned by your trainer.`)
  res.status(201).json({ assignment_id: copy.lastInsertRowid })
})

router.get('/trainer/review-queue', requireRole('trainer'), (req, res) => {
  const rows = db.prepare(`SELECT q.*, c.name AS competency_name, u.name AS created_by_name,
    (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count,
    (SELECT COUNT(*) FROM trainer_reviews tr WHERE tr.quiz_id = q.id) AS reviewed_count
    FROM quizzes q LEFT JOIN competencies c ON c.id = q.competency_id JOIN users u ON u.id = q.created_by
    WHERE q.status IN ('draft','in_review') ORDER BY q.created_at DESC`).all()
  res.json({ queue: rows })
})

router.get('/trainer/quizzes/:id/review', requireRole('trainer'), (req, res) => {
  const quiz = db.prepare(`SELECT q.*, c.name AS competency_name FROM quizzes q LEFT JOIN competencies c ON c.id = q.competency_id WHERE q.id = ?`).get(Number(req.params.id))
  if (!quiz) return httpError(res, 404, 'Quiz not found.')
  const questions = db.prepare(`SELECT q.* FROM quiz_questions qz JOIN questions q ON q.id = qz.question_id WHERE qz.quiz_id = ? ORDER BY qz.position`).all(quiz.id)
  res.json({ quiz, questions: questions.map(q => ({ ...q, options: parseJson(q.options, []), correct_answer: parseJson(q.correct_answer, []) })) })
})

router.put('/trainer/questions/:id', requireRole('trainer'), (req, res) => {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(Number(req.params.id))
  if (!q) return httpError(res, 404, 'Question not found.')
  const { prompt, options, correct_answer, explanation } = req.body || {}
  if (prompt !== undefined && (!String(prompt).trim())) return httpError(res, 400, 'Prompt cannot be empty.')
  if (options !== undefined && (!Array.isArray(options) || options.length < 2)) return httpError(res, 400, 'At least 2 options required.')
  if (correct_answer !== undefined && (!Array.isArray(correct_answer) || !correct_answer.length)) return httpError(res, 400, 'correct_answer must be a non-empty array.')
  if (Array.isArray(options) && Array.isArray(correct_answer)) {
    for (const ca of correct_answer) if (!options.includes(ca)) return httpError(res, 400, 'Correct answer must be one of the options.')
  }
  db.prepare(`UPDATE questions SET
    prompt = COALESCE(?, prompt),
    options = COALESCE(?, options),
    correct_answer = COALESCE(?, correct_answer),
    explanation = COALESCE(?, explanation),
    origin = 'trainer_edited' WHERE id = ?`).run(
    prompt !== undefined ? String(prompt) : null,
    options !== undefined ? JSON.stringify(options) : null,
    correct_answer !== undefined ? JSON.stringify(correct_answer) : null,
    explanation !== undefined ? String(explanation) : null,
    q.id
  )
  db.prepare('INSERT INTO trainer_reviews (quiz_id, trainer_id, question_id, action, edit_note) SELECT quiz_id, ?, ?, \'edited\', ? FROM quiz_questions WHERE question_id = ?')
    .run(req.user.sub, q.id, (req.body && req.body.edit_note) || null, q.id)
  res.json({ question: db.prepare('SELECT * FROM questions WHERE id = ?').get(q.id) })
})

router.post('/trainer/quizzes/:id/approve', requireRole('trainer'), (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(Number(req.params.id))
  if (!quiz) return httpError(res, 404, 'Quiz not found.')
  const { decision } = req.body || {}
  if (!['published', 'in_review'].includes(decision)) return httpError(res, 400, 'decision must be published or in_review.')
  db.prepare('UPDATE quizzes SET status = ? WHERE id = ?').run(decision, quiz.id)
  const questionIds = db.prepare('SELECT question_id FROM quiz_questions WHERE quiz_id = ?').all(quiz.id)
  const mark = db.prepare('INSERT INTO trainer_reviews (quiz_id, trainer_id, question_id, action) VALUES (?, ?, ?, ?)')
  for (const r of questionIds) {
    const already = db.prepare('SELECT id FROM trainer_reviews WHERE quiz_id = ? AND question_id = ?').get(quiz.id, r.question_id)
    if (!already) mark.run(quiz.id, req.user.sub, r.question_id, 'approved')
  }
  res.json({ ok: true, status: decision })
})

router.post('/trainer/feedback', requireRole('trainer'), (req, res) => {
  const { learner_id, message } = req.body || {}
  const learnerId = Number(learner_id)
  if (!message || typeof message !== 'string') return httpError(res, 400, 'message is required.')
  const link = db.prepare('SELECT * FROM trainer_assignments WHERE trainer_id = ? AND learner_id = ?').get(req.user.sub, learnerId)
  if (!link) return httpError(res, 403, 'Learner not assigned to you.')
  db.prepare('INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)')
    .run(learnerId, 'feedback', 'Feedback from your trainer', String(message).slice(0, 1000))
  res.status(201).json({ ok: true })
})

// ---------- Admin ----------
router.get('/admin/analytics', requireRole('admin'), (req, res) => {
  const { domain, department } = req.query
  const learners = db.prepare(`SELECT u.id, lp.department, lp.job_role FROM users u LEFT JOIN learner_profiles lp ON lp.user_id = u.id WHERE u.role = 'learner'`).all()
  const learnerCount = learners.length

  let compRows = db.prepare(`SELECT c.name, c.domain, sg.assessed_level, COUNT(*) AS n FROM skill_gaps sg
    JOIN competencies c ON c.id = sg.competency_id GROUP BY c.name, c.domain, sg.assessed_level`).all()
  if (domain) compRows = compRows.filter(r => r.domain === domain)

  const gapByComp = db.prepare(`SELECT c.name, c.domain, SUM(sg.gap) AS total_gap, COUNT(DISTINCT sg.user_id) AS learners FROM skill_gaps sg
    JOIN competencies c ON c.id = sg.competency_id WHERE sg.gap > 0 GROUP BY c.name, c.domain ORDER BY total_gap DESC`).all()
  const gapsFiltered = domain ? gapByComp.filter(r => r.domain === domain) : gapByComp

  const byDepartment = db.prepare(`SELECT COALESCE(lp.department, 'Unassigned') AS department, COUNT(DISTINCT u.id) AS learners FROM users u
    LEFT JOIN learner_profiles lp ON lp.user_id = u.id WHERE u.role = 'learner' GROUP BY department`).all()

  const completion = db.prepare(`SELECT COUNT(DISTINCT rec.user_id) AS learners_with_activity,
    (SELECT COUNT(*) FROM recommendations WHERE status = 'completed') AS recommendations_completed,
    (SELECT COUNT(*) FROM recommendations WHERE status IN ('open','in_progress')) AS recommendations_open,
    (SELECT COUNT(*) FROM learning_activities WHERE assigned_to IS NOT NULL AND status = 'completed') AS activities_completed,
    (SELECT COUNT(*) FROM quiz_attempts) AS quiz_attempts FROM recommendations rec`).get()

  const trend = db.prepare(`SELECT substr(completed_at, 1, 7) AS month, COUNT(*) AS assessments, ROUND(AVG(score_pct)) AS avg_score
    FROM assessment_results ar JOIN assessments a ON a.id = ar.assessment_id GROUP BY month ORDER BY month`).all()

  const resourceUse = db.prepare(`SELECT lr.title, c.name AS competency, COUNT(rec.id) AS times_recommended,
    SUM(CASE WHEN rec.status = 'completed' THEN 1 ELSE 0 END) AS completions FROM learning_resources lr
    JOIN competencies c ON c.id = lr.competency_id LEFT JOIN recommendations rec ON rec.resource_id = lr.id
    GROUP BY lr.id ORDER BY times_recommended DESC LIMIT 10`).all()

  res.json({
    illustrative: true,
    note: 'Aggregates are computed from synthetic demo data. Predictive-style readings are illustrative only.',
    learner_count: learnerCount,
    competency_distribution: compRows,
    gaps_by_competency: gapsFiltered,
    learners_by_department: byDepartment,
    training_completion: completion,
    assessment_trend: trend,
    resource_usage: resourceUse,
    filters: { domain: domain || null, department: department || null }
  })
})

router.get('/admin/users', requireRole('admin'), (req, res) => {
  const rows = db.prepare(`SELECT u.id, u.email, u.name, u.role, u.language, lp.department, lp.job_role FROM users u
    LEFT JOIN learner_profiles lp ON lp.user_id = u.id ORDER BY u.role, u.name`).all()
  res.json({ users: rows })
})

router.put('/admin/users/:id/role', requireRole('admin'), (req, res) => {
  const { role } = req.body || {}
  if (!['learner', 'trainer', 'admin'].includes(role)) return httpError(res, 400, 'Invalid role.')
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id))
  if (!u) return httpError(res, 404, 'User not found.')
  if (u.id === req.user.sub && role !== 'admin') return httpError(res, 400, 'Cannot demote your own admin account.')
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, u.id)
  res.json({ ok: true })
})

router.get('/admin/resources', requireRole('admin'), (req, res) => {
  const rows = db.prepare(`SELECT r.*, c.name AS competency_name FROM learning_resources r JOIN competencies c ON c.id = r.competency_id ORDER BY r.status, r.title`).all()
  res.json({ resources: rows })
})

router.post('/admin/resources', requireRole('admin'), (req, res) => {
  const { title, competency_id, provider, source_type, resource_type, duration_hours, outcome, url, description } = req.body || {}
  if (!title || typeof title !== 'string') return httpError(res, 400, 'title is required.')
  const comp = db.prepare('SELECT id FROM competencies WHERE id = ?').get(Number(competency_id))
  if (!comp) return httpError(res, 400, 'competency_id must reference a competency.')
  const id = db.prepare(`INSERT INTO learning_resources (title, competency_id, provider, source_type, resource_type, duration_hours, outcome, url, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    String(title).slice(0, 200), comp.id, String(provider || 'Internal').slice(0, 100),
    ['verified', 'demo'].includes(source_type) ? source_type : 'demo',
    ['course', 'case_study', 'module', 'video', 'reading', 'practice'].includes(resource_type) ? resource_type : 'course',
    duration_hours ? Number(duration_hours) : null,
    outcome ? String(outcome).slice(0, 300) : null,
    url ? String(url).slice(0, 300) : null,
    description ? String(description).slice(0, 600) : null
  ).lastInsertRowid
  res.status(201).json({ resource: db.prepare('SELECT * FROM learning_resources WHERE id = ?').get(id) })
})

router.put('/admin/resources/:id/status', requireRole('admin'), (req, res) => {
  const r = db.prepare('SELECT * FROM learning_resources WHERE id = ?').get(Number(req.params.id))
  if (!r) return httpError(res, 404, 'Resource not found.')
  const { status } = req.body || {}
  if (!['published', 'pending_review', 'retired'].includes(status)) return httpError(res, 400, 'Invalid status.')
  db.prepare('UPDATE learning_resources SET status = ? WHERE id = ?').run(status, r.id)
  res.json({ ok: true })
})

// ---------- Assistant ----------
router.get('/assistant/history', requireRole(), (req, res) => {
  const rows = db.prepare('SELECT id, role, content, mode, created_at FROM assistant_messages WHERE user_id = ? ORDER BY id DESC LIMIT 20').all(req.user.sub)
  res.json({ messages: rows.reverse() })
})

router.post('/assistant/ask', requireRole(), async (req, res) => {
  const { question } = req.body || {}
  if (!question || typeof question !== 'string' || question.trim().length < 3) {
    return httpError(res, 400, 'question is required (min 3 chars).')
  }
  const profile = db.prepare('SELECT job_role, interests FROM learner_profiles WHERE user_id = ?').get(req.user.sub)
  const gaps = db.prepare(`SELECT c.name FROM skill_gaps sg JOIN competencies c ON c.id = sg.competency_id WHERE sg.user_id = ? AND sg.gap > 0 ORDER BY sg.gap DESC LIMIT 3`).all(req.user.sub)
  const context = profile ? `Role: ${profile.job_role || 'unspecified'}. Priority gaps: ${gaps.map(g => g.name).join(', ') || 'none recorded'}.` : null
  db.prepare('INSERT INTO assistant_messages (user_id, role, content) VALUES (?, ?, ?)').run(req.user.sub, 'user', String(question).slice(0, 2000))
  const reply = await assistantReply(String(question).slice(0, 2000), context)
  db.prepare('INSERT INTO assistant_messages (user_id, role, content, mode) VALUES (?, ?, ?, ?)').run(req.user.sub, 'assistant', reply.reply, reply.mode)
  res.json(reply)
})

// ---------- Integrations ----------
router.get('/integrations', (req, res) => {
  const rows = db.prepare('SELECT * FROM integration_status ORDER BY id').all()
  res.json({ integrations: rows, ai_live: isLive() })
})

// ---------- Notifications ----------
router.get('/notifications', requireRole(), (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 20').all(req.user.sub)
  const unread = db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0').get(req.user.sub).n
  res.json({ notifications: rows, unread })
})

router.post('/notifications/read', requireRole(), (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.sub)
  res.json({ ok: true })
})

module.exports = router
