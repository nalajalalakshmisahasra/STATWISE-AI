import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import harness from './setup.mjs'

const { start, stop, client, loginAs } = harness

let url
beforeAll(async () => { url = await start() })
afterAll(async () => { await stop() })

describe('auth & sessions', () => {
  it('rejects invalid demo role', async () => {
    const c = await loginAs('learner')
    const r = await c.post('/api/auth/demo', { role: 'superuser' })
    expect(r.status).toBe(400)
  })

  it('returns null user when anonymous', async () => {
    const c = client()
    const r = await c.get('/api/auth/me')
    expect(r.status).toBe(200)
    expect(r.data.user).toBeNull()
  })

  it('demo login sets a session and /me reflects it', async () => {
    const c = await loginAs('learner')
    const r = await c.get('/api/auth/me')
    expect(r.status).toBe(200)
    expect(r.data.user.role).toBe('learner')
    expect(r.data.user.email).toContain('@demo.statwise.in')
  })

  it('email login works for seeded accounts', async () => {
    const c = client()
    const r = await c.post('/api/auth/login', { email: 'priya.nair@demo.statwise.in' })
    expect(r.status).toBe(200)
    expect(r.data.user.role).toBe('learner')
  })

  it('rejects unknown email', async () => {
    const c = client()
    const r = await c.post('/api/auth/login', { email: 'nobody@nowhere.example' })
    expect(r.status).toBe(401)
  })

  it('validates language setting', async () => {
    const c = await loginAs('learner')
    const bad = await c.post('/api/auth/language', { language: 'xx' })
    expect(bad.status).toBe(400)
    const good = await c.post('/api/auth/language', { language: 'hi' })
    expect(good.status).toBe(200)
    expect(good.data.language).toBe('hi')
  })
})

describe('role-based access control (server-side)', () => {
  it('anonymous gets 401 on protected routes', async () => {
    const c = client()
    const r = await c.get('/api/gaps/me')
    expect(r.status).toBe(401)
  })

  it('learner cannot access trainer routes', async () => {
    const c = await loginAs('learner')
    const r = await c.get('/api/trainer/learners')
    expect(r.status).toBe(403)
  })

  it('learner cannot access admin routes', async () => {
    const c = await loginAs('learner')
    const r = await c.get('/api/admin/analytics')
    expect(r.status).toBe(403)
  })

  it('trainer cannot access admin routes', async () => {
    const c = await loginAs('trainer')
    const r = await c.get('/api/admin/users')
    expect(r.status).toBe(403)
  })

  it('trainer cannot access learner-only profile route', async () => {
    const c = await loginAs('trainer')
    const r = await c.get('/api/profiles/me')
    expect(r.status).toBe(403)
  })

  it('admin cannot access learner-only assessment creation', async () => {
    const c = await loginAs('admin')
    const r = await c.post('/api/assessments', {})
    expect(r.status).toBe(403)
  })

  it('trainer sees only their own assigned learners', async () => {
    const meera = await loginAs('trainer')
    const list = await meera.get('/api/trainer/learners')
    expect(list.status).toBe(200)
    const names = list.data.learners.map(l => l.name)
    expect(names).toContain('Arjun Mehta')
    expect(names).not.toContain('Rahul Verma')
    const rahulId = 3
    const detail = await meera.get(`/api/trainer/learners/${rahulId}`)
    expect(detail.status).toBe(403)
  })
})

describe('learner journey: profile → assessment → gaps → recommendations', () => {
  it('saves and edits the profile with validation', async () => {
    const c = await loginAs('learner')
    const bad = await c.put('/api/profiles/me', { job_role: '', experience_years: 200 })
    expect(bad.status).toBe(400)
    const good = await c.put('/api/profiles/me', {
      department: 'Test Division',
      designation: 'Officer',
      job_role: 'Survey Statistician',
      experience_years: 5,
      interests: 'Sampling, SQL'
    })
    expect(good.status).toBe(200)
    expect(good.data.profile.job_role).toBe('Survey Statistician')
  })

  it('completes an assessment with transparent scoring', async () => {
    const c = await loginAs('learner')
    const start = await c.post('/api/assessments', {})
    expect(start.status).toBe(201)
    expect(start.data.questions.length).toBeGreaterThan(0)
    const responses = {}
    for (const q of start.data.questions) responses[q.id] = q.options[0]
    const done = await c.post(`/api/assessments/${start.data.assessment.id}/submit`, { responses })
    expect(done.status).toBe(200)
    expect(done.data.result.total_questions).toBe(start.data.questions.length)
    expect(done.data.breakdown.length).toBe(start.data.questions.length)
    for (const b of done.data.breakdown) {
      expect(typeof b.is_correct).toBe('boolean')
      expect(Array.isArray(b.correct_answer)).toBe(true)
    }
    expect(done.data.gaps.length).toBeGreaterThan(0)
  })

  it('prevents double submission of the same assessment', async () => {
    const c = await loginAs('learner')
    const start = await c.post('/api/assessments', {})
    const responses = {}
    for (const q of start.data.questions) responses[q.id] = q.options[1]
    const first = await c.post(`/api/assessments/${start.data.assessment.id}/submit`, { responses })
    expect(first.status).toBe(200)
    const second = await c.post(`/api/assessments/${start.data.assessment.id}/submit`, { responses })
    expect(second.status).toBe(409)
  })

  it('rejects submit with unknown question id', async () => {
    const c = await loginAs('learner')
    const start = await c.post('/api/assessments', {})
    const r = await c.post(`/api/assessments/${start.data.assessment.id}/submit`, { responses: { 99999: 'x' } })
    expect(r.status).toBe(400)
  })

  it('gap report includes evidence, limitation, and next step', async () => {
    const c = await loginAs('learner')
    const r = await c.get('/api/gaps/me')
    expect(r.status).toBe(200)
    expect(r.data.gaps.length).toBeGreaterThan(0)
    for (const g of r.data.gaps) {
      expect(g.evidence).toBeTruthy()
      expect(g.limitation).toBeTruthy()
      expect(g.next_step).toBeTruthy()
      expect(['Beginner', 'Developing', 'Proficient', 'Advanced']).toContain(g.expected_level)
    }
  })

  it('recommendations are generated and explain rationale', async () => {
    const c = await loginAs('learner')
    const r = await c.get('/api/recommendations/me')
    expect(r.status).toBe(200)
    for (const rec of r.data.recommendations) {
      expect(rec.rationale).toBeTruthy()
      expect(['high', 'medium', 'low']).toContain(rec.priority)
      expect(['gap', 'interest', 'adaptive', 'assignment', 'history']).toContain(rec.basis)
      expect(rec.title).toBeTruthy()
      expect(rec.provider).toBeTruthy()
    }
  })

  it('recommendation status update validates input', async () => {
    const c = await loginAs('learner')
    const recs = await c.get('/api/recommendations/me')
    if (!recs.data.recommendations.length) return
    const id = recs.data.recommendations[0].id
    const bad = await c.post(`/api/recommendations/${id}/status`, { status: 'weird' })
    expect(bad.status).toBe(400)
    const ok = await c.post(`/api/recommendations/${id}/status`, { status: 'in_progress' })
    expect(ok.status).toBe(200)
  })
})

describe('activities & progress', () => {
  it('lists activities and completes one with a reflection', async () => {
    const c = await loginAs('learner')
    const list = await c.get('/api/activities')
    expect(list.status).toBe(200)
    const act = list.data.activities.find(a => a.assigned_to === null) || list.data.activities[0]
    const detail = await c.get(`/api/activities/${act.id}`)
    expect(detail.status).toBe(200)
    expect(detail.data.activity.content.scenario).toBeTruthy()
    const ok = await c.post(`/api/activities/${act.id}/complete`, { reflection: 'My approach: refresh the frame and stratify by market size, then monitor aging monthly.' })
    expect(ok.status).toBe(200)
    expect(ok.data.nextStep.action).toBeTruthy()
    const progress = await c.get('/api/progress/me')
    expect(progress.data.progress.some(p => p.record_type === 'activity')).toBe(true)
  })
})

describe('quizzes: generation, fallback honesty, attempts', () => {
  it('generates a fallback quiz with honest labeling when AI is unconfigured', async () => {
    const c = await loginAs('learner')
    const r = await c.post('/api/quizzes/generate', { topic: 'Sampling', use_sample: true })
    expect(r.status).toBe(201)
    expect(r.data.mode).toBe('fallback')
    expect(r.data.note).toMatch(/NOT AI|fallback/i)
    expect(r.data.status).toBe('in_review')
  })

  it('rejects generation without enough source text', async () => {
    const c = await loginAs('learner')
    const r = await c.post('/api/quizzes/generate', { topic: 'Sampling', text: 'short', use_sample: false })
    expect(r.status).toBe(400)
  })

  it('keeps unpublished quizzes out of learner listing until approved', async () => {
    const c = await loginAs('learner')
    const before = await c.get('/api/quizzes')
    await c.post('/api/quizzes/generate', { topic: 'Data Quality Frameworks', use_sample: true })
    const after = await c.get('/api/quizzes')
    for (const q of after.data.quizzes) expect(q.status).toBe('published')
    expect(before.data.quizzes.length).toBe(after.data.quizzes.length)
  })

  it('trainer reviews, edits, and publishes a generated quiz', async () => {
    const learner = await loginAs('learner')
    const gen = await learner.post('/api/quizzes/generate', { topic: 'Sampling', use_sample: true })
    const quizId = gen.data.quiz_id

    const trainer = await loginAs('trainer')
    const detail = await trainer.get(`/api/trainer/quizzes/${quizId}/review`)
    expect(detail.status).toBe(200)
    expect(detail.data.questions.length).toBeGreaterThan(0)

    const q = detail.data.questions[0]
    const edit = await trainer.put(`/api/trainer/questions/${q.id}`, {
      prompt: q.prompt,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: 'Edited explanation for clarity.'
    })
    expect(edit.status).toBe(200)
    expect(edit.data.question.origin).toBe('trainer_edited')

    const publish = await trainer.post(`/api/trainer/quizzes/${quizId}/approve`, { decision: 'published' })
    expect(publish.status).toBe(200)
    expect(publish.data.status).toBe('published')

    const learnerList = await learner.get('/api/quizzes')
    expect(learnerList.data.quizzes.some(x => x.id === quizId)).toBe(true)
  })

  it('trainer cannot publish with an invalid decision', async () => {
    const trainer = await loginAs('trainer')
    const queue = await trainer.get('/api/trainer/review-queue')
    if (!queue.data.queue.length) return
    const r = await trainer.post(`/api/trainer/quizzes/${queue.data.queue[0].id}/approve`, { decision: 'blast' })
    expect(r.status).toBe(400)
  })

  it('learner attempts a published quiz and gets scored feedback with next step', async () => {
    const c = await loginAs('learner')
    const list = await c.get('/api/quizzes')
    const quiz = list.data.quizzes[0]
    const detail = await c.get(`/api/quizzes/${quiz.id}`)
    const answers = {}
    for (const q of detail.data.questions) answers[q.question_id] = q.options[0]
    const r = await c.post(`/api/quizzes/${quiz.id}/attempt`, { answers })
    expect(r.status).toBe(200)
    expect(typeof r.data.score_pct).toBe('number')
    expect(r.data.breakdown.length).toBe(detail.data.questions.length)
    expect(r.data.next_step).toBeTruthy()
    expect(['revise', 'practice', 'advance']).toContain(r.data.next_step.action)
  })
})

describe('trainer workflows', () => {
  it('assigns an activity to an assigned learner and notifies them', async () => {
    const trainer = await loginAs('trainer')
    const learners = await trainer.get('/api/trainer/learners')
    const learnerId = learners.data.learners[0].id
    const act = await trainer.post('/api/trainer/assign', { learner_id: learnerId, activity_id: 2, due_date: '2026-10-15' })
    expect(act.status).toBe(201)

    const learner = await loginAs('learner')
    const notes = await learner.get('/api/notifications')
    expect(notes.data.notifications.some(n => n.type === 'assignment')).toBe(true)
  })

  it('refuses assignment to an unassigned learner', async () => {
    const trainer = await loginAs('trainer')
    const r = await trainer.post('/api/trainer/assign', { learner_id: 3, activity_id: 1 })
    expect(r.status).toBe(403)
  })

  it('sends feedback that reaches the learner', async () => {
    const trainer = await loginAs('trainer')
    const learners = await trainer.get('/api/trainer/learners')
    const learnerId = learners.data.learners[0].id
    const fb = await trainer.post('/api/trainer/feedback', { learner_id: learnerId, message: 'Focus on weighting next week.' })
    expect(fb.status).toBe(201)
    const learner = await loginAs('learner')
    const notes = await learner.get('/api/notifications')
    expect(notes.data.notifications.some(n => n.type === 'feedback')).toBe(true)
  })

  it('cohort gap analysis aggregates assigned learners only', async () => {
    const trainer = await loginAs('trainer')
    const r = await trainer.get('/api/trainer/cohort-gaps')
    expect(r.status).toBe(200)
    expect(r.data.learners).toBe(2)
  })
})

describe('admin analytics & management', () => {
  it('returns aggregate analytics with illustrative flag', async () => {
    const c = await loginAs('admin')
    const r = await c.get('/api/admin/analytics')
    expect(r.status).toBe(200)
    expect(r.data.illustrative).toBe(true)
    expect(r.data.learner_count).toBeGreaterThan(0)
    expect(r.data.learners_by_department.length).toBeGreaterThan(0)
    expect(Array.isArray(r.data.gaps_by_competency)).toBe(true)
  })

  it('supports domain filter', async () => {
    const c = await loginAs('admin')
    const r = await c.get('/api/admin/analytics?domain=Technical')
    expect(r.status).toBe(200)
    for (const g of r.data.gaps_by_competency) expect(g.domain).toBe('Technical')
  })

  it('manages resources: create, publish, retire', async () => {
    const c = await loginAs('admin')
    const comps = await c.get('/api/competencies')
    const compId = comps.data.competencies.find(x => x.code === 'SQL').id
    const created = await c.post('/api/admin/resources', {
      title: 'SQL Window Functions Clinic',
      competency_id: compId,
      provider: 'Internal (sample)',
      source_type: 'demo',
      resource_type: 'module',
      duration_hours: 3
    })
    expect(created.status).toBe(201)
    const id = created.data.resource.id
    const retire = await c.put(`/api/admin/resources/${id}/status`, { status: 'retired' })
    expect(retire.status).toBe(200)
    const bad = await c.post('/api/admin/resources', { title: 'No competency' })
    expect(bad.status).toBe(400)
  })

  it('changes user roles with validation', async () => {
    const c = await loginAs('admin')
    const bad = await c.put('/api/admin/users/2/role', { role: 'emperor' })
    expect(bad.status).toBe(400)
    const ok = await c.put('/api/admin/users/2/role', { role: 'learner' })
    expect(ok.status).toBe(200)
  })
})

describe('AI assistant & integrations', () => {
  it('assistant answers with honest fallback labeling', async () => {
    const c = await loginAs('learner')
    const bad = await c.post('/api/assistant/ask', { question: 'hi' })
    expect(bad.status).toBe(400)
    const r = await c.post('/api/assistant/ask', { question: 'Explain stratification in survey sampling' })
    expect(r.status).toBe(200)
    expect(r.data.mode).toBe('fallback')
    expect(r.data.reply.length).toBeGreaterThan(30)
  })

  it('assistant history is persisted per user', async () => {
    const c = await loginAs('learner')
    const r = await c.get('/api/assistant/history')
    expect(r.status).toBe(200)
    expect(Array.isArray(r.data.messages)).toBe(true)
  })

  it('integration status is honestly labelled', async () => {
    const c = client()
    const r = await c.get('/api/integrations')
    expect(r.status).toBe(200)
    const igot = r.data.integrations.find(i => i.key === 'igot')
    expect(igot.status).toBe('demo_data')
    const mk = r.data.integrations.find(i => i.key === 'mission_karmayogi')
    expect(mk.status).toBe('requires_authorization')
    const ai = r.data.integrations.find(i => i.key === 'ai_provider')
    expect(ai.status).toBe('not_configured')
  })
})
