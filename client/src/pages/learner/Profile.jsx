import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { LANGUAGES } from '../../locales/strings.js'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Button, Field, Badge, inputStyle, SuccessNote, ErrorState, Spinner } from '../../components/ui.jsx'

const JOB_ROLES = ['Economic Statistician', 'Survey Statistician', 'Industrial Statistician', 'SDG Data Analyst']
const STATUSES = ['student', 'working_professional', 'researcher', 'government_employee', 'trainer', 'other']
const COMPETENCY_NAMES = ['Survey Design', 'Sampling', 'National Accounts', 'Price Statistics', 'Labour Statistics', 'Agricultural Statistics', 'Industrial Statistics', 'SDG Indicators', 'Metadata Standards', 'Data Quality Frameworks', 'Python', 'R', 'SQL', 'Stata', 'SPSS', 'SAS', 'GIS', 'Data Visualization', 'AI/ML', 'Cloud Computing', 'APIs', 'Open Data']
const LEVELS = ['Beginner', 'Developing', 'Proficient', 'Advanced']

/** Learner profile editor (spec §14): everything persisted, everything editable later. */
export default function LearnerProfile () {
  const { t, user, setLang } = useApp()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverErr, setServerErr] = useState(null)

  useEffect(() => {
    api.get('/api/profiles/me')
      .then(d => setProfile(d.profile || emptyProfile()))
      .catch(e => setServerErr(e))
      .finally(() => setLoading(false))
  }, [])

  function emptyProfile () {
    return {
      department: '', designation: '', job_role: '', assignment: '', education: '',
      experience_years: '', previous_training: '', interests: [], learning_goals: [],
      learning_preferences: [], skill_levels: {}, available_time: '',
      current_status: '', field_of_study: ''
    }
  }

  function set (k, v) {
    setProfile(p => ({ ...p, [k]: v }))
    setSaved(false)
  }

  function parseList (v) {
    if (Array.isArray(v)) return v
    if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
    return []
  }

  function validate () {
    const e = {}
    if (!profile.job_role || !profile.job_role.trim()) e.job_role = t('profile.roleError')
    if (profile.experience_years !== '' && profile.experience_years !== null) {
      const n = Number(profile.experience_years)
      if (Number.isNaN(n) || n < 0 || n > 50) e.experience_years = t('profile.experienceError')
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function save (ev) {
    ev.preventDefault()
    setServerErr(null)
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        ...profile,
        interests: parseList(profile.interests),
        experience_years: profile.experience_years === '' ? null : Number(profile.experience_years)
      }
      const d = await api.put('/api/profiles/me', payload)
      setProfile({ ...d.profile, experience_years: d.profile.experience_years ?? '' })
      setSaved(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setServerErr(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />
  if (serverErr && !profile) return <ErrorState message={serverErr.message} onRetry={() => window.location.reload()} />

  const interests = parseList(profile.interests)
  const chip = (selected, onClick, label) => (
    <button
      key={label} type="button" aria-pressed={selected} onClick={onClick}
      style={{
        padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
        border: selected ? '1.5px solid var(--teal-600)' : '1px solid var(--ink-200)',
        background: selected ? 'var(--teal-50)' : 'var(--surface)',
        color: selected ? 'var(--teal-800)' : 'var(--ink-600)', fontFamily: 'inherit'
      }}
    >{label}</button>
  )

  return (
    <>
      <PageTitle
        title={t('nav.profile')}
        subtitle={t('profile.subtitle')}
      />
      {saved && <div style={{ marginBottom: 14 }}><SuccessNote>{t('profile.savedNote')}</SuccessNote></div>}
      {serverErr && <div style={{ marginBottom: 14 }}><ErrorState message={serverErr.message} /></div>}

      <form onSubmit={save} noValidate style={{ maxWidth: 760 }}>
        <Card>
          <h3 style={{ marginBottom: 2 }}>{t('profile.accountSection')}</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-400)' }}>{t('profile.langHint')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 18px' }}>
            <Field label={t('auth.name')}>
              <input style={inputStyle} value={(user && user.name) || ''} disabled />
            </Field>
            <Field label={t('login.email')}>
              <input style={inputStyle} value={(user && user.email) || ''} disabled />
            </Field>
            <Field label={t('lang.label')} hint={t('profile.langHint')}>
              <select style={inputStyle} value={user && user.language} onChange={e => { setLang(e.target.value) }}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 14 }}>{t('profile.onboardingSection')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 18px' }}>
            <Field label={t('onb.s1.title')}>
              <select style={inputStyle} value={profile.current_status || ''} onChange={e => set('current_status', e.target.value)}>
                <option value="">{t('onb.rolePlaceholder')}</option>
                {STATUSES.map(s => <option key={s} value={s}>{t('onb.status.' + s)}</option>)}
              </select>
            </Field>
            <Field label={t('onb.s2.title')}>
              <input style={inputStyle} value={profile.field_of_study || ''} onChange={e => set('field_of_study', e.target.value)} placeholder={t('onb.fieldPlaceholder')} />
            </Field>
            <Field label={t('onb.roleLabel')} required error={errors.job_role} hint={t('onb.roleHint')}>
              <select style={inputStyle} value={profile.job_role || ''} onChange={e => set('job_role', e.target.value)} aria-invalid={Boolean(errors.job_role)}>
                <option value="">{t('onb.rolePlaceholder')}</option>
                {JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label={t('onb.s7.title')}>
              <select style={inputStyle} value={profile.available_time || ''} onChange={e => set('available_time', e.target.value)}>
                <option value="">{t('onb.rolePlaceholder')}</option>
                {['15_min', '30_min', '1_hour', '2_hours_plus'].map(c => <option key={c} value={c}>{t('onb.time.' + c)}</option>)}
              </select>
            </Field>
          </div>

          <Field label={t('onb.s3.title')} hint={t('profile.interestsHint')}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group">
              {['Statistical Analysis', 'Data Visualization', 'Machine Learning', 'Survey Methodology', 'Official Statistics', 'Research', 'Data Management', 'Probability'].map(i =>
                chip(interests.includes(i), () => set('interests', interests.includes(i) ? interests.filter(x => x !== i) : [...interests, i]), i)
              )}
            </div>
          </Field>
          <Field label={t('onb.s6.title')}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group">
              {['Video', 'Reading', 'Practice questions', 'Interactive exercises', 'Case studies', 'Guided learning'].map(p =>
                chip(parseList(profile.learning_preferences).includes(p), () => {
                  const cur = parseList(profile.learning_preferences)
                  set('learning_preferences', cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p])
                }, p)
              )}
            </div>
          </Field>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 14 }}>{t('profile.professionalSection')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 18px' }}>
            <Field label={t('profile.department')}>
              <input style={inputStyle} value={profile.department || ''} onChange={e => set('department', e.target.value)} placeholder="e.g. National Accounts Division" />
            </Field>
            <Field label={t('profile.designation')}>
              <input style={inputStyle} value={profile.designation || ''} onChange={e => set('designation', e.target.value)} placeholder="e.g. Assistant Director" />
            </Field>
            <Field label={t('profile.assignment')}>
              <input style={inputStyle} value={profile.assignment || ''} onChange={e => set('assignment', e.target.value)} placeholder="e.g. GDP compilation" />
            </Field>
            <Field label={t('profile.education')}>
              <input style={inputStyle} value={profile.education || ''} onChange={e => set('education', e.target.value)} placeholder="e.g. M.Sc. Statistics" />
            </Field>
            <Field label={t('profile.experience')} error={errors.experience_years}>
              <input type="number" min="0" max="50" style={inputStyle} value={profile.experience_years ?? ''} onChange={e => set('experience_years', e.target.value)} />
            </Field>
            <Field label={t('profile.previousTraining')} hint={t('profile.previousTrainingHint')}>
              <input style={inputStyle} value={profile.previous_training || ''} onChange={e => set('previous_training', e.target.value)} placeholder="e.g. NSSTA Foundation Course" />
            </Field>
          </div>
          <Field label={t('profile.selfReported')} hint={t('profile.selfReportedHint')}>
            <input style={inputStyle} value={Array.isArray(profile.self_reported_skills) ? '' : (profile.self_reported_skills || '')} onChange={e => set('self_reported_skills', e.target.value)} placeholder="e.g. Sampling:Proficient; SQL:Developing" />
          </Field>
          <details style={{ marginTop: 4, marginBottom: 14, fontSize: 13, color: 'var(--ink-500)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('profile.validSkills')}</summary>
            <p style={{ margin: '8px 0 4px' }}>{COMPETENCY_NAMES.join(' · ')}</p>
            <p style={{ margin: 0 }}>{t('profile.levels')}: {LEVELS.join(' · ')}</p>
          </details>
          <Button type="submit" loading={saving}>{t('action.save')}</Button>
        </Card>
      </form>
    </>
  )
}
