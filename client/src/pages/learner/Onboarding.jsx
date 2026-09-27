import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { Logo, Button, Card, Field, Badge, Icon, OptionCard, ProgressBar, inputStyle, Spinner, ErrorState } from '../../components/ui.jsx'

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

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)' }}>
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '10px 18px 80px' }}>
        {/* Guided progress rail: past ✓ · current highlighted · upcoming dimmed */}
        <ol aria-label="Onboarding progress" style={{ listStyle: 'none', display: 'flex', gap: 6, padding: 0, margin: '0 0 10px' }}>
          {STEPS.map((s, i) => (
            <li key={s.key} aria-current={i === step ? 'step' : undefined} style={{ flex: 1 }}>
              <div style={{
                height: 5, borderRadius: 99,
                background: i < step ? 'var(--teal-500)' : i === step ? 'var(--amber-500)' : 'var(--surface-3)',
                transition: 'background-color .25s ease'
              }} />
              <div style={{
                fontSize: 10.5, marginTop: 6, fontWeight: 650, letterSpacing: '0.04em',
                color: i === step ? 'var(--amber-600)' : i < step ? 'var(--teal-700)' : 'var(--ink-300)',
                textTransform: 'uppercase', textAlign: 'center'
              }}>
                {i < step ? '✓' : i + 1}
              </div>
            </li>
          ))}
        </ol>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
          <span className="eyebrow">{t('onb.stepOf', { n: step + 1, total: STEPS.length })}</span>
          <span className="metric" style={{ fontSize: 13, color: 'var(--ink-500)' }}>{pct}%</span>
        </div>

        <Card className="anim-in" style={{ padding: 30 }}>
          <h1 style={{ fontSize: 23, marginBottom: 4 }}>{STEPS[step].title}</h1>
          <p style={{ color: 'var(--ink-500)', marginTop: 0, fontSize: 14, marginBottom: 22 }}>{STEPS[step].sub}</p>
          {err && <div role="alert" style={{ color: 'var(--danger)', fontSize: 13.5, marginBottom: 10 }}>{err.message}</div>}

          {step === 0 && (
            <div role="radiogroup" aria-label={STEPS[0].title} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {STATUSES.map(s => (
                <OptionCard key={s} role="radio" aria-checked={form.current_status === s} multi={false}
                  selected={form.current_status === s} onClick={() => set('current_status', s)}
                  title={t('onb.status.' + s)} />
              ))}
            </div>
          )}

          {step === 1 && (
            <>
              <Field label={t('onb.fieldLabel')}>
                <input style={inputStyle} value={form.field_of_study} onChange={e => set('field_of_study', e.target.value)} placeholder={t('onb.fieldPlaceholder')} />
              </Field>
              <div role="radiogroup" aria-label={STEPS[1].title} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {FIELDS.map(f => (
                  <button key={f} type="button" aria-pressed={form.field_of_study === f}
                    style={{
                      padding: '8px 15px', borderRadius: 999, cursor: 'pointer', fontSize: 13.3, fontWeight: 600, fontFamily: 'inherit',
                      border: form.field_of_study === f ? '1.5px solid var(--teal-600)' : '1px solid var(--ink-200)',
                      background: form.field_of_study === f ? 'var(--teal-50)' : 'var(--surface)',
                      color: form.field_of_study === f ? 'var(--teal-800)' : 'var(--ink-700)'
                    }}
                    onClick={() => set('field_of_study', f)}>{f}</button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <div role="group" aria-label={STEPS[2].title} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 9 }}>
              {INTERESTS.map(i => (
                <OptionCard key={i} multi selected={form.interests.includes(i)} onClick={() => toggle('interests', i)} title={i} />
              ))}
            </div>
          )}

          {step === 3 && (
            <div role="group" aria-label={STEPS[3].title} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 9 }}>
              {GOALS.map(g => (
                <OptionCard key={g} multi selected={form.learning_goals.includes(g)} onClick={() => toggle('learning_goals', g)} title={g} />
              ))}
            </div>
          )}

          {step === 4 && (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--radius-md)', padding: '11px 14px', marginBottom: 16 }}>
                <Icon name="bell" size={16} color="var(--amber-600)" style={{ marginTop: 2 }} />
                <p style={{ fontSize: 13, color: 'var(--amber-700)', margin: 0 }}>{t('onb.selfLevelNote')}</p>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {['Sampling', 'Data Visualization', 'Python', 'SQL', 'Survey Design'].map(comp => (
                  <div key={comp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid var(--ink-50)', paddingBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{comp}</span>
                    <div role="radiogroup" aria-label={comp} style={{ display: 'flex', gap: 6 }}>
                      {LEVELS.map(l => (
                        <button key={l} type="button" role="radio" aria-checked={form.skill_levels[comp] === l}
                          style={{
                            padding: '6px 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                            border: form.skill_levels[comp] === l ? '1.5px solid var(--teal-600)' : '1px solid var(--ink-200)',
                            background: form.skill_levels[comp] === l ? 'var(--teal-50)' : 'var(--surface)',
                            color: form.skill_levels[comp] === l ? 'var(--teal-800)' : 'var(--ink-500)'
                          }}
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
            <div role="group" aria-label={STEPS[5].title} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 9 }}>
              {PREFS.map(p => (
                <OptionCard key={p} multi selected={form.learning_preferences.includes(p)} onClick={() => toggle('learning_preferences', p)} title={p} />
              ))}
            </div>
          )}

          {step === 6 && (
            <>
              <div role="group" aria-label={STEPS[6].title} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 9, marginBottom: 20 }}>
                {TIMES.map(tm => (
                  <OptionCard key={tm.code} selected={form.available_time === tm.code} onClick={() => set('available_time', tm.code)} title={t('onb.time.' + tm.code)} />
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

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--ink-50)' }}>
            <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || saving}>← {t('onb.back')}</Button>
            {step < STEPS.length - 1
              ? <Button onClick={next} loading={saving} disabled={!STEPS[step].done()}>{t('onb.next')} →</Button>
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
