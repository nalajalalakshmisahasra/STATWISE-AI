import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Button, Field, inputStyle, SuccessNote, ErrorState, Spinner } from '../../components/ui.jsx'

const JOB_ROLES = ['Economic Statistician', 'Survey Statistician', 'Industrial Statistician', 'SDG Data Analyst']
const COMPETENCY_NAMES = ['Survey Design', 'Sampling', 'National Accounts', 'Price Statistics', 'Labour Statistics', 'Agricultural Statistics', 'Industrial Statistics', 'SDG Indicators', 'Metadata Standards', 'Data Quality Frameworks', 'Python', 'R', 'SQL', 'Stata', 'SPSS', 'SAS', 'GIS', 'Data Visualization', 'AI/ML', 'Cloud Computing', 'APIs', 'Open Data']
const LEVELS = ['Beginner', 'Developing', 'Proficient', 'Advanced']

export default function LearnerProfile () {
  const { t } = useApp()
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
    return { department: '', designation: '', job_role: '', assignment: '', education: '', experience_years: '', previous_training: '', interests: '', self_reported_skills: '' }
  }

  function set (k, v) {
    setProfile(p => ({ ...p, [k]: v }))
    setSaved(false)
  }

  function validate () {
    const e = {}
    if (!profile.job_role || !profile.job_role.trim()) e.job_role = 'Job role is required — it drives your competency expectations.'
    if (profile.experience_years !== '' && profile.experience_years !== null) {
      const n = Number(profile.experience_years)
      if (Number.isNaN(n) || n < 0 || n > 50) e.experience_years = 'Experience must be between 0 and 50.'
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
        experience_years: profile.experience_years === '' ? null : Number(profile.experience_years)
      }
      const d = await api.put('/api/profiles/me', payload)
      setProfile(d.profile)
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

  return (
    <>
      <PageTitle
        title={t('nav.profile')}
        subtitle="Your profile drives the role competency framework, gap expectations, and recommendations."
      />
      {saved && <div style={{ marginBottom: 14 }}><SuccessNote>Profile saved. Gap expectations were recomputed for your role.</SuccessNote></div>}
      {serverErr && <div style={{ marginBottom: 14 }}><ErrorState message={serverErr.message} /></div>}

      <form onSubmit={save} noValidate style={{ maxWidth: 760 }}>
        <Card>
          <h3 style={{ marginBottom: 14 }}>Professional details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 18px' }}>
            <Field label="Department / Division">
              <input style={inputStyle} value={profile.department || ''} onChange={e => set('department', e.target.value)} placeholder="e.g. National Accounts Division" />
            </Field>
            <Field label="Designation">
              <input style={inputStyle} value={profile.designation || ''} onChange={e => set('designation', e.target.value)} placeholder="e.g. Assistant Director" />
            </Field>
            <Field label="Job role" required error={errors.job_role} hint="Determines the expected competency levels.">
              <select style={inputStyle} value={profile.job_role || ''} onChange={e => set('job_role', e.target.value)} aria-invalid={Boolean(errors.job_role)}>
                <option value="">Select a role…</option>
                {JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Current assignment">
              <input style={inputStyle} value={profile.assignment || ''} onChange={e => set('assignment', e.target.value)} placeholder="e.g. GDP compilation" />
            </Field>
            <Field label="Education">
              <input style={inputStyle} value={profile.education || ''} onChange={e => set('education', e.target.value)} placeholder="e.g. M.Sc. Statistics" />
            </Field>
            <Field label="Experience (years)" error={errors.experience_years}>
              <input type="number" min="0" max="50" style={inputStyle} value={profile.experience_years ?? ''} onChange={e => set('experience_years', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 14 }}>Learning context</h3>
          <Field label="Previous training" hint="Courses or programmes already completed.">
            <input style={inputStyle} value={profile.previous_training || ''} onChange={e => set('previous_training', e.target.value)} placeholder="e.g. NSSTA Foundation Course" />
          </Field>
          <Field label="Interests" hint="Comma-separated; matched to competencies for recommendations.">
            <input style={inputStyle} value={profile.interests || ''} onChange={e => set('interests', e.target.value)} placeholder="e.g. National Accounts, Python" />
          </Field>
          <Field label="Self-reported skills" hint="Format: Skill:Level, separated by semicolons.">
            <input style={inputStyle} value={profile.self_reported_skills || ''} onChange={e => set('self_reported_skills', e.target.value)} placeholder="e.g. Sampling:Proficient; SQL:Developing" />
          </Field>
          <details style={{ marginTop: 4, marginBottom: 14, fontSize: 13, color: 'var(--ink-500)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Valid skills & levels</summary>
            <p style={{ margin: '8px 0 4px' }}>{COMPETENCY_NAMES.join(' · ')}</p>
            <p style={{ margin: 0 }}>Levels: {LEVELS.join(' · ')}</p>
          </details>
          <Button type="submit" loading={saving}>{t('action.save')}</Button>
        </Card>
      </form>
    </>
  )
}
