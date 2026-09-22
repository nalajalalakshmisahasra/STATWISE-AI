/**
 * Core domain services: transparent scoring, explainable gap analysis,
 * recommendation generation, and adaptive next-step logic.
 */
const db = require('./db')
const { LEVEL_ORDER, levelIndex, levelFromScore } = require('./types')

/** Parse an answer value that may be a JSON array, a plain string, or already an array. */
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
  return [s]
}

/** Grade one question: correct if response set matches answer set (order-insensitive). */
function gradeResponse (question, response) {
  const correct = new Set(parseAnswer(question.correct_answer))
  const given = new Set(Array.isArray(response) ? response : [response])
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
function generateRecommendations (userId) {
  const profile = db.prepare('SELECT * FROM learner_profiles WHERE user_id = ?').get(userId)
  const gaps = db.prepare('SELECT * FROM skill_gaps WHERE user_id = ? AND gap > 0 ORDER BY gap DESC').all(userId)
  const existing = new Set(
    db.prepare("SELECT resource_id FROM recommendations WHERE user_id = ? AND status != 'dismissed'").all(userId).map(r => r.resource_id)
  )
  const make = db.prepare(`INSERT INTO recommendations (user_id, resource_id, competency_id, rationale, priority, basis)
    VALUES (?, ?, ?, ?, ?, ?)`)

  // 1. Gap-driven
  for (const g of gaps) {
    const res = db.prepare(`SELECT * FROM learning_resources WHERE competency_id = ? AND status = 'published' ORDER BY id`).all(g.competency_id)
    const pick = res.find(r => !existing.has(r.id))
    if (!pick) continue
    const priority = g.gap >= 2 ? 'high' : 'medium'
    const rationale = `Your assessed level (${g.assessed_level || 'not assessed'}) is below the expected level (${g.expected_level}) for this role. This resource targets that gap.`
    make.run(userId, pick.id, g.competency_id, rationale, priority, 'gap')
    existing.add(pick.id)
  }

  // 2. Interest-driven (when no gap coverage)
  if (profile && profile.interests) {
    const interests = profile.interests.toLowerCase()
    const comps = db.prepare('SELECT * FROM competencies').all()
    for (const c of comps) {
      if (interests.includes(c.name.toLowerCase())) {
        const res = db.prepare(`SELECT * FROM learning_resources WHERE competency_id = ? AND status = 'published' ORDER BY id`).all(c.id)
        const pick = res.find(r => !existing.has(r.id))
        if (!pick) continue
        make.run(userId, pick.id, c.id,
          `Matches your stated interest in ${c.name}.`, 'low', 'interest')
        existing.add(pick.id)
      }
    }
  }

  // 3. Adaptive: revision after weak quiz performance
  const weakQuiz = db.prepare(`SELECT qa.quiz_id, qa.score_pct, q.competency_id FROM quiz_attempts qa
    JOIN quizzes q ON q.id = qa.quiz_id WHERE qa.user_id = ? AND qa.score_pct < 60
    ORDER BY qa.created_at DESC LIMIT 3`).all(userId)
  for (const w of weakQuiz) {
    if (!w.competency_id || existing.size > 40) continue
    const res = db.prepare(`SELECT * FROM learning_resources WHERE competency_id = ? AND status = 'published' ORDER BY id`).all(w.competency_id)
    const pick = res.find(r => !existing.has(r.id))
    if (!pick) continue
    make.run(userId, pick.id, w.competency_id,
      `You scored ${Math.round(w.score_pct)}% on a recent quiz in this area — a revision resource is suggested before retaking.`, 'high', 'adaptive')
    existing.add(pick.id)
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
  recomputeGapsFromProgress
}
