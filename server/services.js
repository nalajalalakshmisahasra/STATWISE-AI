/**
 * Core domain services: transparent scoring, explainable gap analysis,
 * recommendation generation, and adaptive next-step logic.
 */
const db = require('./db')
const { LEVEL_ORDER, levelIndex, levelFromScore } = require('./types')

/** Parse an answer value that may be a JSON array, a JSON-encoded string, a plain string, or already an array. */
function parseAnswer (value) {
  if (Array.isArray(value)) return value.map(String)
  if (value === null || value === undefined) return []
  const s = String(value)
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s)
      return Array.isArray(parsed) ? parsed.map(String) : [s]
    } catch { return [s] }
  }
  if (s.startsWith('"')) {
    // JSON-encoded scalar (e.g. responses stored with JSON.stringify): unwrap it.
    try {
      const parsed = JSON.parse(s)
      if (typeof parsed === 'string') return [parsed]
    } catch { /* fall through */ }
  }
  return [s]
}

/** Grade one question: correct if response set matches answer set (order-insensitive). */
function gradeResponse (question, response) {
  const correct = new Set(parseAnswer(question.correct_answer))
  // parseAnswer (not a bare Set) so re-grading a stored, JSON-encoded response
  // matches the raw answer that was originally submitted.
  const given = new Set(parseAnswer(response))
  if (correct.size !== given.size) return false
  for (const v of given) if (!correct.has(v)) return false
  return true
}

/** Score an assessment: per-question grading + per-competency aggregation. Transparent by design. */
function scoreAssessment (assessmentId, userId) {
  const questions = db.prepare('SELECT * FROM questions WHERE assessment_id = ?').all(assessmentId)
  const responses = db.prepare('SELECT question_id, response FROM assessment_responses WHERE assessment_id = ?').all(assessmentId)
  const respMap = new Map(responses.map(r => [r.question_id, r.response]))

  let correct = 0
  const compScores = {}
  for (const q of questions) {
    const given = respMap.get(q.id)
    const ok = given !== undefined && gradeResponse(q, given)
    if (ok) correct++
    const cid = q.competency_id
    if (!compScores[cid]) compScores[cid] = { total: 0, correct: 0 }
    compScores[cid].total++
    if (ok) compScores[cid].correct++
  }
  const total = questions.length
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0
  return { total, correct, scorePct, compScores }
}

/** Persist a completed assessment: results row, per-competency skill gaps, progress record. */
function completeAssessment (assessmentId, userId, title) {
  const existing = db.prepare('SELECT * FROM assessment_results WHERE assessment_id = ?').get(assessmentId)
  if (existing) return existing

  const { total, correct, scorePct, compScores } = scoreAssessment(assessmentId, userId)

  db.prepare(`INSERT INTO assessment_results (assessment_id, user_id, total_questions, correct_count, score_pct, competency_scores)
    VALUES (?, ?, ?, ?, ?, ?)`).run(assessmentId, userId, total, correct, scorePct, JSON.stringify(compScores))
  db.prepare(`UPDATE assessments SET status = 'completed', completed_at = datetime('now') WHERE id = ?`).run(assessmentId)

  const setGap = db.prepare(`INSERT INTO skill_gaps (user_id, competency_id, assessed_level, expected_level, gap, computed_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT (user_id, competency_id) DO UPDATE SET
      assessed_level = excluded.assessed_level,
      expected_level = excluded.expected_level,
      gap = excluded.gap,
      computed_at = datetime('now')`)

  for (const [cid, sc] of Object.entries(compScores)) {
    const ratio = sc.total > 0 ? sc.correct / sc.total : 0
    const assessed = levelFromScore(ratio)
    const req = db.prepare(`SELECT r.expected_level FROM role_competency_requirements r
      JOIN learner_profiles p ON p.user_id = ? AND r.job_role = p.job_role
      WHERE r.competency_id = ?`).get(userId, cid)
    const expected = req ? req.expected_level : null
    const gap = expected ? levelIndex(expected) - levelIndex(assessed) : 0
    setGap.run(userId, Number(cid), assessed, expected || assessed, gap)
    db.prepare(`INSERT INTO progress_records (user_id, competency_id, record_type, reference_id, level_after, note)
      VALUES (?, ?, 'assessment', ?, ?, ?)`)
      .run(userId, Number(cid), assessmentId, assessed, `Assessment "${title}": ${sc.correct}/${sc.total} correct`)
  }
  return db.prepare('SELECT * FROM assessment_results WHERE assessment_id = ?').get(assessmentId)
}

/** Explainable gap report for a learner. */
function gapReport (userId) {
  const profile = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(userId)
  const role = profile ? profile.job_role : null
  const requirements = role
    ? db.prepare(`SELECT r.*, c.name, c.domain, c.description FROM role_competency_requirements r
        JOIN competencies c ON c.id = r.competency_id WHERE r.job_role = ?`).all(role)
    : []
  const gaps = db.prepare('SELECT * FROM skill_gaps WHERE user_id = ?').all(userId)
  const gapMap = new Map(gaps.map(g => [g.competency_id, g]))
  const progress = db.prepare('SELECT competency_id, level_after FROM progress_records WHERE user_id = ? ORDER BY created_at DESC').all(userId)
  const latestProgress = new Map()
  for (const p of progress) if (!latestProgress.has(p.competency_id)) latestProgress.set(p.competency_id, p.level_after)

  return requirements.map(req => {
    const g = gapMap.get(req.competency_id)
    const assessed = g ? g.assessed_level : (latestProgress.get(req.competency_id) || null)
    const gapLevels = assessed ? levelIndex(req.expected_level) - levelIndex(assessed) : null
    let evidence
    if (g) evidence = `Assessed at ${assessed} based on completed assessment responses.`
    else if (assessed) evidence = `Recorded level ${assessed} from completed learning activity.`
    else evidence = 'No assessment evidence yet — level not established by any completed assessment.'
    let limitation = ''
    if (!assessed) limitation = 'No assessment taken for this competency; expectation shown from the illustrative role framework.'
    else limitation = 'Based on a short sample assessment and an illustrative framework; not a validated professional certification.'
    let nextStep
    if (gapLevels === null || gapLevels <= 0) nextStep = 'Maintain proficiency with periodic practice or a refresher case study.'
    else if (gapLevels === 1) nextStep = 'Targeted course or case study recommended to close one level.'
    else nextStep = 'Structured learning path recommended: foundational module followed by practice and reassessment.'
    return {
      competency: req.name,
      domain: req.domain,
      description: req.description,
      expected_level: req.expected_level,
      assessed_level: assessed,
      gap: gapLevels,
      relevance: req.relevance,
      evidence,
      limitation,
      next_step: nextStep
    }
  })
}

/** Personalized recommendations: gap-first, then interests, then adaptive/assignment basis. */
/**
 * Personalized recommendation engine.
 *
 * Deterministic and explainable. Evidence (assessed gaps, weak quiz attempts)
 * establishes NEED; profile fields (interests, goals, field, self-reported
 * levels) tune RELEVANCE only — interests alone never create a competency
 * claim. Every recommendation stores its rationale and the `basis` that
 * produced it so the UI can show "why this was recommended".
 */
function generateRecommendations (userId) {
  const profile = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(userId)
  const gaps = db.prepare('SELECT * FROM skill_gaps WHERE user_id = ? AND gap > 0 ORDER BY gap DESC').all(userId)
  const existing = new Set(
    db.prepare("SELECT resource_id FROM recommendations WHERE user_id = ? AND status != 'dismissed'").all(userId).map(r => r.resource_id)
  )
  const make = db.prepare(`INSERT INTO recommendations (user_id, resource_id, competency_id, rationale, priority, basis)
    VALUES (?, ?, ?, ?, ?, ?)`)
  const pub = cid => db.prepare(`SELECT * FROM learning_resources WHERE competency_id = ? AND status = 'published' ORDER BY id`).all(cid)

  const parseList = (s) => {
    if (!s) return []
    try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return String(s).split(',').map(x => x.trim()).filter(Boolean) }
  }
  const parseObj = (s) => {
    if (!s) return {}
    try { const v = JSON.parse(s); return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {} } catch { return {} }
  }
  const interests = profile ? parseList(profile.interests).map(x => String(x).toLowerCase()) : []
  const goals = profile ? parseList(profile.learning_goals).map(x => String(x).toLowerCase()) : []
  const field = profile && profile.field_of_study ? String(profile.field_of_study).toLowerCase() : ''
  const selfLevels = profile ? parseObj(profile.skill_levels) : {}

  const competencyName = (cid) => {
    const c = db.prepare('SELECT name FROM competencies WHERE id = ?').get(cid)
    return c ? c.name : 'this competency'
  }

  // 1. Evidence-first: assessed competency gaps (the only source of "gap" claims)
  for (const g of gaps) {
    const res = pub(g.competency_id)
    const pick = res.find(r => !existing.has(r.id))
    if (!pick) continue
    const priority = g.gap >= 2 ? 'high' : 'medium'
    const roleNote = profile && profile.job_role ? ` for ${profile.job_role}` : ''
    const rationale = `Assessment evidence: you were placed at ${g.assessed_level || 'no recorded level'} while ${g.expected_level} is expected${roleNote} — a gap of ${g.gap} level${g.gap > 1 ? 's' : ''}. This resource targets ${competencyName(g.competency_id)} directly.`
    make.run(userId, pick.id, g.competency_id, rationale, priority, 'gap')
    existing.add(pick.id)
  }

  // 2. Evidence: weak quiz performance (below 60%) → revision before retake
  const weakQuiz = db.prepare(`SELECT qa.score_pct, q.competency_id, q.title FROM quiz_attempts qa
    JOIN quizzes q ON q.id = qa.quiz_id WHERE qa.user_id = ? AND qa.score_pct < 60
    ORDER BY qa.created_at DESC LIMIT 3`).all(userId)
  for (const w of weakQuiz) {
    if (!w.competency_id || existing.size > 40) continue
    const res = pub(w.competency_id)
    const pick = res.find(r => !existing.has(r.id))
    if (!pick) continue
    make.run(userId, pick.id, w.competency_id,
      `You scored ${Math.round(w.score_pct)}% on the quiz “${w.title}” — a revision resource is suggested before retaking.`, 'high', 'adaptive')
    existing.add(pick.id)
  }

  // 3. Relevance: interests, goals and field. These NEVER create a competency
  //    claim — they only match published resources to what the learner cares about.
  if (interests.length || goals.length || field) {
    const comps = db.prepare('SELECT * FROM competencies').all()
    for (const c of comps) {
      if (existing.size > 40) break
      const nameL = c.name.toLowerCase()
      const matchedInterest = interests.find(i => i && (nameL.includes(i) || i.includes(nameL)))
      const matchedGoal = goals.find(go => go && (nameL.includes(go) || go.includes(nameL)))
      const matchedField = field && (nameL.includes(field) || field.includes(nameL))
      if (!matchedInterest && !matchedGoal && !matchedField) continue
      const res = pub(c.id)
      const pick = res.find(r => !existing.has(r.id))
      if (!pick) continue
      const reasonParts = []
      if (matchedInterest) reasonParts.push(`your stated interest in ${c.name}`)
      if (matchedGoal) reasonParts.push('your learning goals')
      if (matchedField) reasonParts.push(`your field (${profile.field_of_study})`)
      const selfLevel = selfLevels[c.name]
      const selfNote = selfLevel ? ` Your self-assessed level here is ${selfLevel} (self-reported, not assessment evidence).` : ''
      make.run(userId, pick.id, c.id,
        `Matches ${reasonParts.join(' and ')}.${selfNote}`, 'low', 'interest')
      existing.add(pick.id)
    }
  }
}

/** Adaptive next-step advice after a quiz attempt or activity completion. */
function adaptiveNextStep (userId, competencyId, scorePct) {
  const comp = db.prepare('SELECT name FROM competencies WHERE id = ?').get(competencyId)
  const name = comp ? comp.name : 'this competency'
  if (scorePct < 60) {
    return { action: 'revise', reason: `Score of ${Math.round(scorePct)}% suggests foundational revision for ${name} would help before moving on.` }
  }
  if (scorePct >= 85) {
    return { action: 'advance', reason: `Strong result (${Math.round(scorePct)}%) on ${name}: more advanced material or a harder case study is appropriate.` }
  }
  return { action: 'practice', reason: `Solid but improvable (${Math.round(scorePct)}%) on ${name}: a practice activity will consolidate the concept.` }
}

/**
 * Personalized dashboard payload (spec §7): every block is evidence-backed.
 * `focus` = the single suggested next action; goals/interests shape relevance
 * labels only. No placeholder metrics — blocks render honest empty states.
 */
function dashboardData (userId) {
  const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId)
  const profile = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(userId)
  const gaps = gapReport(userId)
  const openGaps = gaps.filter(g => g.gap > 0)
  const lastResult = db.prepare(`SELECT ar.*, a.title FROM assessment_results ar
    JOIN assessments a ON a.id = ar.assessment_id WHERE ar.user_id = ? ORDER BY ar.created_at DESC LIMIT 1`).get(userId)
  const resultsCount = db.prepare('SELECT COUNT(*) AS n FROM assessment_results WHERE user_id = ?').get(userId).n
  const recs = db.prepare(`SELECT rec.*, lr.title, lr.provider, lr.source_type, lr.resource_type, lr.duration_hours, lr.url, c.name AS competency_name
    FROM recommendations rec JOIN learning_resources lr ON lr.id = rec.resource_id JOIN competencies c ON c.id = rec.competency_id
    WHERE rec.user_id = ? AND rec.status != 'dismissed'
    ORDER BY CASE rec.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, rec.id LIMIT 6`).all(userId)
  const progress = db.prepare(`SELECT p.*, c.name AS competency_name FROM progress_records p JOIN competencies c ON c.id = p.competency_id
    WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 8`).all(userId)
  const quizAttempts = db.prepare(`SELECT qa.score_pct, qa.correct_count, qa.total_questions, qa.created_at, q.title, q.competency_id, c.name AS competency_name
    FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id LEFT JOIN competencies c ON c.id = q.competency_id
    WHERE qa.user_id = ? ORDER BY qa.created_at DESC LIMIT 5`).all(userId)
  const assignedActivities = db.prepare(`SELECT la.id, la.title, la.due_date, la.status, c.name AS competency_name FROM learning_activities la
    JOIN competencies c ON c.id = la.competency_id WHERE la.assigned_to = ? AND la.status = 'assigned' ORDER BY la.due_date IS NULL, la.due_date LIMIT 4`).all(userId)
  const parseList = (s) => {
    if (!s) return []
    try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return String(s).split(',').map(x => x.trim()).filter(Boolean) }
  }

  // Suggested next action — deterministic precedence, evidence-based.
  let focus = null
  if (!profile || !profile.onboarding_completed) {
    focus = { action: 'onboarding', reason: 'Complete your learner profile so expectations and recommendations reflect your goals.', link: '/learner/onboarding' }
  } else if (resultsCount === 0) {
    focus = { action: 'assessment', reason: 'Complete your initial assessment to generate your competency profile.', link: '/learner/assessment' }
  } else if (assignedActivities.length > 0) {
    focus = { action: 'activity', reason: `Your trainer assigned “${assignedActivities[0].title}”${assignedActivities[0].due_date ? ` — due ${String(assignedActivities[0].due_date).slice(0, 10)}` : ''}.`, link: `/learner/activities/${assignedActivities[0].id}` }
  } else if (openGaps.length > 0) {
    focus = { action: 'gap', reason: `Close your largest gap: ${openGaps[0].competency} (${openGaps[0].assessed_level || 'not assessed'} → ${openGaps[0].expected_level}).`, link: '/learner/recommendations' }
  } else {
    focus = { action: 'reassess', reason: 'All assessed competencies meet role expectations — retake an assessment to confirm and unlock advanced material.', link: '/learner/assessment' }
  }

  return {
    user: { name: user ? user.name : 'Learner' },
    profile: profile ? {
      job_role: profile.job_role,
      current_status: profile.current_status,
      field_of_study: profile.field_of_study,
      learning_goals: parseList(profile.learning_goals),
      interests: parseList(profile.interests),
      learning_preferences: parseList(profile.learning_preferences),
      available_time: profile.available_time,
      onboarding_completed: Boolean(profile.onboarding_completed)
    } : null,
    focus,
    gaps: { open: openGaps.length, total: gaps.length, top: openGaps.slice(0, 4) },
    last_result: lastResult ? { score_pct: lastResult.score_pct, title: lastResult.title, completed_at: lastResult.completed_at } : null,
    assessment_count: resultsCount,
    recommendations: recs,
    quiz_attempts: quizAttempts,
    progress,
    assigned_activities: assignedActivities
  }
}

/** Recompute gaps for a learner from all progress records (fallback when no assessment). */
function recomputeGapsFromProgress (userId) {
  const progress = db.prepare('SELECT competency_id, level_after FROM progress_records WHERE user_id = ? ORDER BY created_at DESC').all(userId)
  const latest = new Map()
  for (const p of progress) if (!latest.has(p.competency_id) && p.level_after) latest.set(p.competency_id, p.level_after)
  const setGap = db.prepare(`INSERT INTO skill_gaps (user_id, competency_id, assessed_level, expected_level, gap, computed_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT (user_id, competency_id) DO UPDATE SET
      assessed_level = excluded.assessed_level,
      expected_level = excluded.expected_level,
      gap = excluded.gap,
      computed_at = datetime('now')`)
  for (const [cid, level] of latest) {
    const req = db.prepare(`SELECT r.expected_level FROM role_competency_requirements r
      JOIN learner_profiles p ON p.user_id = ? AND r.job_role = p.job_role
      WHERE r.competency_id = ?`).get(userId, cid)
    const expected = req ? req.expected_level : null
    const gap = expected ? levelIndex(expected) - levelIndex(level) : 0
    setGap.run(userId, cid, level, expected || level, gap)
  }
}

module.exports = {
  parseAnswer,
  gradeResponse,
  scoreAssessment,
  completeAssessment,
  gapReport,
  generateRecommendations,
  adaptiveNextStep,
  recomputeGapsFromProgress,
  dashboardData
}
