import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { Logo, Button, Card, Field, Badge, inputStyle, Spinner, ErrorState } from '../../components/ui.jsx'

const STATUSES = ['student', 'working_professional', 'researcher', 'government_employee', 'trainer', 'other']
const FIELDS = ['Statistics', 'Data Science', 'Economics', 'Mathematics', 'Computer Science', 'Research', 'Public Administration']
const INTERESTS = ['Statistical Analysis', 'Data Visualization', 'Machine Learning', 'Survey Methodology', 'Official Statistics', 'Research', 'Data Management', 'Probability']
const GOALS = ['Improve statistical fundamentals', 'Learn data analysis', 'Improve visualization', 'Prepare for assessments', 'Develop professional competency', 'Learn advanced statistical methods']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const PREFS = ['Video', 'Reading', 'Practice questions', 'Interactive exercises', 'Case studies', 'Guided learning']
const TIMES = [
  { code: '15_min', label: '15 minutes/day' },
  { code: '30_min', label: '30 minutes/day' },
  { code: '1_hour', label: '1 hour/day' },
  { code: '2_hours_plus', label: '2+ hours/day' }
]

const JOB_ROLES = ['Economic Statistician', 'Survey Statistician', 'Industrial Statistician', 'SDG Data Analyst']

/**
 * Role-specific onboarding (spec §6): a 7-step wizard persisted per step.
 * A refresh mid-wizard lands back on the wizard (route guard) with previously
 * saved steps pre-filled from the server. Self-reported skill level is stored
 * but explicitly never used as competency evidence.
 */
export default function Onboarding () {
  const { t, user, login } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [form, setForm] = useState({
    current_status: '',
    field_of_study: '',
    interests: [],
    learning_goals: [],
    skill_levels: {},
    learning_preferences: [],
    available_time: '',
    job_role: ''
  })

  useEffect(() => {
    api.get('/api/profiles/me')
      .then(d => {
        const p = d.profile
        if (p) {
          setForm(f => ({
            ...f,
            current_status: p.current_status || f.current_status,
            field_of_study: p.field_of_study || f.field_of_study,
            interests: Array.isArray(p.interests) ? p.interests : (p.interests ? String(p.interests).split(',').map(s => s.trim()).filter(Boolean) : []),
            learning_goals: Array.isArray(p.learning_goals) ? p.learning_goals : [],
            skill_levels: p.skill_levels && typeof p.skill_levels === 'object' ? p.skill_levels : {},
            learning_preferences: Array.isArray(p.learning_preferences) ? p.learning_preferences : [],
            available_time: p.available_time || f.available_time,
            job_role: p.job_role || f.job_role
          }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const STEPS = useMemo(() => ([
    { key: 'status', title: t('onb.s1.title'), sub: t('onb.s1.sub'), done: () => Boolean(form.current_status) },
    { key: 'field', title: t('onb.s2.title'), sub: t('onb.s2.sub'), done: () => form.field_of_study.trim().length > 0 },
    { key: 'interests', title: t('onb.s3.title'), sub: t('onb.s3.sub'), done: () => form.interests.length > 0 },
    { key: 'goals', title: t('onb.s4.title'), sub: t('onb.s4.sub'), done: () => form.learning_goals.length > 0 },
    { key: 'levels', title: t('onb.s5.title'), sub: t('onb.s5.sub'), done: () => true },
    { key: 'prefs', title: t('onb.s6.title'), sub: t('onb.s6.sub'), done: () => form.learning_preferences.length > 0 },
    { key: 'time', title: t('onb.s7.title'), sub: t('onb.s7.sub'), done: () => Boolean(form.available_time) }
  ]), [t, form])

  function set (k, v) { setForm(f => ({ ...f, [k]: v })) }

  function toggle (k, v) {
    setForm(f => {
      const arr = f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v]
      return { ...f, [k]: arr }
    })
  }

  async function persist (partial, complete = false) {
    setSaving(true); setErr(null)
    try {
      await api.post('/api/profiles/onboarding', { ...partial, complete })
      return true
    } catch (e) { setErr(e); return false } finally { setSaving(false) }
  }

  async function next () {
    const ok = await persist(stepPayload(), false)
    if (ok) setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  function stepPayload () {
    switch (STEPS[step].key) {
      case 'status': return { current_status: form.current_status }
      case 'field': return { field_of_study: form.field_of_study }
      case 'interests': return { interests: form.interests }
      case 'goals': return { learning_goals: form.learning_goals }
      case 'levels': return { skill_levels: form.skill_levels }
      case 'prefs': return { learning_preferences: form.learning_preferences }
      case 'time': return { available_time: form.available_time }
      default: return {}
    }
  }

  async function finish () {
    // Job role drives the competency framework expectations; the wizard collects
    // it last so learners understand why it is needed.
    const roleOk = Boolean(form.job_role)
    if (!roleOk) { setErr(new Error(t('onb.roleRequired'))); return }
    const ok = await persist({
      current_status: form.current_status,
      field_of_study: form.field_of_study,
      interests: form.interests,
      learning_goals: form.learning_goals,
      skill_levels: form.skill_levels,
      learning_preferences: form.learning_preferences,
      available_time: form.available_time,
      job_role: form.job_role
    }, true)
    if (!ok) return
    // Refresh the client user object so the route guard sees
    // onboarding_completed = true instead of bouncing us back here.
    try {
      const me = await api.get('/api/auth/me')
      if (me.user) login(me.user)
    } catch { /* navigation still proceeds; guard re-checks server state */ }
    navigate('/learner')
  }

  if (loading) return <Spinner label={t('loading')} />
  if (err && step === 0 && !saving) {
    return <ErrorState message={err.message} onRetry={() => window.location.reload()} />
  }

  const pct = Math.round(((step + 1) / STEPS.length) * 100)
  const chip = (selected) => ({
    padding: '9px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 600,
    border: selected ? '2px solid var(--teal-700)' : '1px solid var(--ink-200)',
    background: selected ? 'var(--teal-100)' : 'var(--white)', color: 'var(--ink-900)', fontFamily: 'inherit'
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-50)' }}>
      <header style={{ background: 'var(--teal-900)', color: 'var(--paper)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo light size={30} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge kind="amber" style={{ background: 'rgba(232,171,74,.18)', color: 'var(--amber-400)' }}>{t('role.' + (user ? user.role : 'learner'))}</Badge>
          <span style={{ fontSize: 13.5, opacity: 0.85 }}>{user && user.name}</span>
        </div>
      </header>
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '30px 18px 70px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }} aria-hidden="true">
          <div style={{ flex: 1, height: 6, background: 'var(--teal-100)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--teal-600), var(--teal-400))', borderRadius: 999, transition: 'width .3s ease' }} />
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--ink-500)', fontWeight: 600 }}>{step + 1} / {STEPS.length}</span>
        </div>

        <Card>
          <h1 style={{ fontSize: 21, color: 'var(--teal-950)', marginBottom: 4 }}>{STEPS[step].title}</h1>
          <p style={{ color: 'var(--ink-500)', marginTop: 0, fontSize: 14 }}>{STEPS[step].sub}</p>
          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 13.5, marginBottom: 10 }}>{err.message}</div>}

          {step === 0 && (
            <div role="radiogroup" aria-label={STEPS[0].title} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
              {STATUSES.map(s => (
                <button key={s} type="button" role="radio" aria-checked={form.current_status === s} style={chip(form.current_status === s)} onClick={() => set('current_status', s)}>
                  {t('onb.status.' + s)}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <>
              <Field label={t('onb.fieldLabel')}>
                <input style={inputStyle} value={form.field_of_study} onChange={e => set('field_of_study', e.target.value)} placeholder={t('onb.fieldPlaceholder')} />
              </Field>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {FIELDS.map(f => (
                  <button key={f} type="button" style={chip(form.field_of_study === f)} onClick={() => set('field_of_study', f)}>{f}</button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label={STEPS[2].title}>
              {INTERESTS.map(i => (
                <button key={i} type="button" aria-pressed={form.interests.includes(i)} style={chip(form.interests.includes(i))} onClick={() => toggle('interests', i)}>{i}</button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label={STEPS[3].title}>
              {GOALS.map(g => (
                <button key={g} type="button" aria-pressed={form.learning_goals.includes(g)} style={chip(form.learning_goals.includes(g))} onClick={() => toggle('learning_goals', g)}>{g}</button>
              ))}
            </div>
          )}

          {step === 4 && (
            <>
              <p style={{ fontSize: 13.5, color: 'var(--ink-500)', background: 'var(--amber-100)', borderRadius: 10, padding: '10px 14px' }}>
                {t('onb.selfLevelNote')}
              </p>
              <div style={{ display: 'grid', gap: 12 }}>
                {['Sampling', 'Data Visualization', 'Python', 'SQL', 'Survey Design'].map(comp => (
                  <div key={comp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{comp}</span>
                    <div role="radiogroup" aria-label={comp} style={{ display: 'flex', gap: 6 }}>
                      {LEVELS.map(l => (
                        <button key={l} type="button" role="radio" aria-checked={form.skill_levels[comp] === l}
                          style={{ ...chip(form.skill_levels[comp] === l), padding: '6px 12px', fontSize: 13 }}
                          onClick={() => set('skill_levels', { ...form.skill_levels, [comp]: l })}>
                          {t('onb.level.' + l)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 5 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label={STEPS[5].title}>
              {PREFS.map(p => (
                <button key={p} type="button" aria-pressed={form.learning_preferences.includes(p)} style={chip(form.learning_preferences.includes(p))} onClick={() => toggle('learning_preferences', p)}>{p}</button>
              ))}
            </div>
          )}

          {step === 6 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10, marginBottom: 18 }} role="group" aria-label={STEPS[6].title}>
                {TIMES.map(tm => (
                  <button key={tm.code} type="button" aria-pressed={form.available_time === tm.code} style={chip(form.available_time === tm.code)} onClick={() => set('available_time', tm.code)}>
                    {t('onb.time.' + tm.code)}
                  </button>
                ))}
              </div>
              <Field label={t('onb.roleLabel')} required hint={t('onb.roleHint')}>
                <select style={inputStyle} value={form.job_role} onChange={e => set('job_role', e.target.value)}>
                  <option value="">{t('onb.rolePlaceholder')}</option>
                  {JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 22 }}>
            <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || saving}>{t('onb.back')}</Button>
            {step < STEPS.length - 1
              ? <Button onClick={next} loading={saving} disabled={!STEPS[step].done()}>{t('onb.next')}</Button>
              : <Button onClick={finish} loading={saving} disabled={!form.available_time}>{t('onb.finish')}</Button>}
          </div>
        </Card>

        <p style={{ fontSize: 12.5, color: 'var(--ink-400)', marginTop: 14, textAlign: 'center' }}>
          {t('onb.editLater')}
        </p>
      </main>
    </div>
  )
}
