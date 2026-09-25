import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import harness from './setup.mjs'

const { start, stop, client } = harness

let url
beforeAll(async () => { url = await start() })
afterAll(async () => { await stop() })

/** Register + verify a fresh account; returns { c, email, user }. */
async function registerAndVerify ({ role = 'learner', language = 'en', name = 'Test Learner' } = {}) {
  const c = client()
  const email = `user-${Math.random().toString(36).slice(2, 8)}@example.com`
  const r = await c.post('/api/auth/register', { name, email, password: 'Password123!', role, language })
  expect(r.status).toBe(201)
  const devCode = r.data.delivery && r.data.delivery.dev_code
  expect(devCode).toMatch(/^\d{6}$/) // dev fallback must be clearly provided for tests
  const v = await c.post('/api/auth/verify', { email, code: devCode })
  expect(v.status).toBe(200)
  expect(v.data.user.email).toBe(email)
  return { c, email, user: v.data.user }
}

describe('registration & secure verification', () => {
  it('registers a learner, verifies with OTP, and starts a session', async () => {
    const { c, user } = await registerAndVerify({ language: 'hi' })
    expect(user.role).toBe('learner')
    expect(user.language).toBe('hi')
    expect(user.onboarding_completed).toBe(false)
    const me = await c.get('/api/auth/me')
    expect(me.data.user.email_verified).toBe(true)
  })

  it('rejects invalid registration input (short password, bad email, bad role)', async () => {
    const c = client()
    const short = await c.post('/api/auth/register', { name: 'A B', email: 'a@b.com', password: 'short' })
    expect(short.status).toBe(400)
    const badEmail = await c.post('/api/auth/register', { name: 'A B', email: 'not-an-email', password: 'Password123!' })
    expect(badEmail.status).toBe(400)
    const badRole = await c.post('/api/auth/register', { name: 'A B', email: 'a2@b.com', password: 'Password123!', role: 'superadmin' })
    expect(badRole.status).toBe(400)
  })

  it('never allows a client role claim to create an admin account', async () => {
    const c = client()
    const r = await c.post('/api/auth/register', { name: 'Escalation Attempt', email: `admin-${Math.random().toString(36).slice(2, 8)}@example.com`, password: 'Password123!', role: 'admin' })
    expect(r.status).toBe(400)
    expect(r.data.error.toLowerCase()).toContain('provisioned')
  })

  it('promotes a requested trainer role only after verification', async () => {
    const { user } = await registerAndVerify({ role: 'trainer', name: 'Trainer Via OTP' })
    expect(user.role).toBe('trainer')
  })

  it('rejects a wrong OTP, then accepts the correct one', async () => {
    const c = client()
    const email = `otp-${Math.random().toString(36).slice(2, 8)}@example.com`
    const r = await c.post('/api/auth/register', { name: 'Otp User', email, password: 'Password123!' })
    const code = r.data.delivery.dev_code
    const wrong = await c.post('/api/auth/verify', { email, code: code === '000000' ? '111111' : '000000' })
    expect(wrong.status).toBe(401)
    const right = await c.post('/api/auth/verify', { email, code })
    expect(right.status).toBe(200)
  })

  it('rejects malformed codes and unknown emails', async () => {
    const c = client()
    expect((await c.post('/api/auth/verify', { email: 'ghost@example.com', code: '123456' })).status).toBe(404)
    const r = await c.post('/api/auth/verify', { email: 'someone@example.com', code: '12ab56' })
    expect(r.status).toBe(400)
  })

  it('enforces the resend cooldown', async () => {
    const c = client()
    const email = `resend-${Math.random().toString(36).slice(2, 8)}@example.com`
    await c.post('/api/auth/register', { name: 'Resend User', email, password: 'Password123!' })
    const again = await c.post('/api/auth/resend', { email })
    expect(again.status).toBe(429)
  })

  it('rejects duplicate registration for a verified email', async () => {
    const { email } = await registerAndVerify()
    const c2 = client()
    const dup = await c2.post('/api/auth/register', { name: 'Dup', email, password: 'Password123!' })
    expect(dup.status).toBe(409)
  })

  it('locks the account after repeated failed logins', async () => {
    const { email } = await registerAndVerify()
    const c = client()
    for (let i = 0; i < 5; i++) {
      await c.post('/api/auth/login', { email, password: 'definitely-wrong' })
    }
    const locked = await c.post('/api/auth/login', { email, password: 'Password123!' })
    expect(locked.status).toBe(423)
  })

  it('logout destroys the session', async () => {
    const { c } = await registerAndVerify()
    const before = await c.get('/api/auth/me')
    expect(before.data.user).not.toBeNull()
    await c.post('/api/auth/logout', {})
    const after = await c.get('/api/auth/me')
    expect(after.data.user).toBeNull()
  })
})

describe('learner onboarding', () => {
  it('persists each step and completion flag across a fresh session', async () => {
    const { c, email } = await registerAndVerify()
    await c.post('/api/profiles/onboarding', { current_status: 'student', field_of_study: 'Statistics' })
    await c.post('/api/profiles/onboarding', { interests: ['Data Visualization', 'Machine Learning'] })
    await c.post('/api/profiles/onboarding', { learning_goals: ['Learn data analysis'] })
    await c.post('/api/profiles/onboarding', { skill_levels: { 'Data Visualization': 'Beginner' } })
    await c.post('/api/profiles/onboarding', { learning_preferences: ['Video', 'Case studies'] })
    const done = await c.post('/api/profiles/onboarding', { job_role: 'SDG Data Analyst', available_time: '30_min', complete: true })
    expect(done.status).toBe(200)
    expect(done.data.onboarding_completed).toBe(true)

    // Refresh-safe: a brand-new session sees the same state.
    const c2 = client()
    const login = await c2.post('/api/auth/login', { email, password: 'Password123!' })
    expect(login.status).toBe(200)
    const prof = await c2.get('/api/profiles/me')
    expect(prof.data.profile.current_status).toBe('student')
    expect(prof.data.profile.interests).toEqual(['Data Visualization', 'Machine Learning'])
    expect(prof.data.profile.onboarding_completed).toBe(1)
  })

  it('refuses completion without a job_role (drives the framework)', async () => {
    const { c } = await registerAndVerify()
    const r = await c.post('/api/profiles/onboarding', { complete: true })
    expect(r.status).toBe(400)
  })

  it('rejects invalid enum values', async () => {
    const { c } = await registerAndVerify()
    const badTime = await c.post('/api/profiles/onboarding', { available_time: 'all_day' })
    expect(badTime.status).toBe(400)
  })

  it('is learner-only (trainer gets 403)', async () => {
    const c = client()
    const login = await c.post('/api/auth/demo', { role: 'trainer' })
    expect(login.status).toBe(200)
    const r = await c.post('/api/profiles/onboarding', { job_role: 'x' })
    expect(r.status).toBe(403)
  })
})

describe('personalization loop: profile → assessment → gaps → recommendations → reassessment', () => {
  async function onboardAndAssess (c, { answersAllFirst = true, expectAssessmentFocus = true } = {}) {
    const ob = await c.post('/api/profiles/onboarding', {
      current_status: 'student', field_of_study: 'Statistics',
      interests: ['Data Visualization'], learning_goals: ['Learn data analysis'],
      learning_preferences: ['Video'], available_time: '30_min',
      job_role: 'SDG Data Analyst', complete: true
    })
    expect(ob.status).toBe(200)
    expect(ob.data.onboarding_completed).toBe(true)
    const dash0 = await c.get('/api/dashboard/me')
    if (expectAssessmentFocus) expect(dash0.data.focus.action).toBe('assessment')
    const start = await c.post('/api/assessments', {})
    expect(start.status).toBe(201)
    const responses = {}
    for (const q of start.data.questions) responses[q.id] = answersAllFirst ? q.options[0] : q.options[q.options.length - 1]
    const done = await c.post(`/api/assessments/${start.data.assessment.id}/submit`, { responses })
    expect(done.status).toBe(200)
    return done.data
  }

  it('dashboard focus moves assessment → gaps → recommendations after evidence exists', async () => {
    const { c } = await registerAndVerify()
    await onboardAndAssess(c)
    const dash = await c.get('/api/dashboard/me')
    expect(['gap', 'reassess', 'activity']).toContain(dash.data.focus.action)
    expect(dash.data.recommendations.length).toBeGreaterThan(0)
    expect(dash.data.profile.learning_goals).toContain('Learn data analysis')
  })

  it('recommendations are gap-anchored with explainable rationale', async () => {
    const { c } = await registerAndVerify()
    const d = await onboardAndAssess(c)
    const openGaps = (await c.get('/api/gaps/me')).data.gaps.filter(g => g.gap > 0)
    const recs = await c.get('/api/recommendations/me')
    const gapBasis = recs.data.recommendations.filter(r => r.basis === 'gap')
    if (openGaps.length > 0) {
      // Every open gap with a published resource must yield an evidence-based rec.
      expect(gapBasis.length).toBeGreaterThan(0)
      for (const g of gapBasis) {
        expect(g.rationale.toLowerCase()).toContain('assessment evidence')
        expect(g.rationale).toContain('expected')
      }
    } else {
      // Perfect evidence: no gap recs may exist, and the loop stays honest.
      expect(d.result.score_pct).toBeGreaterThan(0)
      expect(gapBasis.length).toBe(0)
    }
  })

  it('interests alone never create a gap-based recommendation', async () => {
    const { c } = await registerAndVerify()
    await c.post('/api/profiles/onboarding', {
      field_of_study: 'Statistics',
      interests: ['Machine Learning', 'Data Visualization'],
      learning_goals: ['Learn data analysis'],
      job_role: 'SDG Data Analyst',
      available_time: '1_hour',
      complete: true
    })
    const recs = await c.get('/api/recommendations/me')
    for (const r of recs.data.recommendations) {
      if (r.basis === 'gap') expect(r.rationale.toLowerCase()).toContain('assessment evidence')
    }
    const bases = new Set(recs.data.recommendations.map(r => r.basis))
    expect(bases.has('interest')).toBe(true) // relevance row exists
  })

  it('reassessment updates competency scores, gaps and recommendations', async () => {
    const { c } = await registerAndVerify()
    const first = await onboardAndAssess(c, { answersAllFirst: true })
    const gaps1 = (await c.get('/api/gaps/me')).data.gaps
    const second = await onboardAndAssess(c, { answersAllFirst: false, expectAssessmentFocus: false })
    const gaps2 = (await c.get('/api/gaps/me')).data.gaps
    const results = (await c.get('/api/assessments/results')).data.results
    expect(results.length).toBe(2)
    if (first.result.score_pct !== second.result.score_pct) {
      expect(JSON.stringify(gaps2)).not.toBe(JSON.stringify(gaps1))
    }
  })

  it('dashboard is learner-only', async () => {
    const c = client()
    await c.post('/api/auth/demo', { role: 'admin' })
    const r = await c.get('/api/dashboard/me')
    expect(r.status).toBe(403)
  })

  it('assistant context endpoint still works after onboarding (mode labelled)', async () => {
    const { c } = await registerAndVerify()
    await c.post('/api/profiles/onboarding', {
      interests: ['Sampling'], learning_goals: ['Improve statistical fundamentals'], job_role: 'Survey Statistician', complete: true
    })
    const r = await c.post('/api/assistant/ask', { question: 'Explain stratified sampling' })
    expect(r.status).toBe(200)
    expect(['ai', 'fallback']).toContain(r.data.mode)
    expect(r.data.reply.length).toBeGreaterThan(10)
  })
})
