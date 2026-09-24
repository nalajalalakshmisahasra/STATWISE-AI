import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useApp } from '../lib/app-context.jsx'
import { Logo, Button, Card, Field, inputStyle } from '../components/ui.jsx'

const DEMO = [
  { role: 'learner', name: 'Arjun Mehta', desc: 'Economic Statistician · learner workspace' },
  { role: 'trainer', name: 'Meera Iyer', desc: 'Trainer · NES-2026 Cohort A' },
  { role: 'admin', name: 'Kavya Sharma', desc: 'Administrator · platform analytics' }
]

export default function Login () {
  const { t, login } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  async function enter (role) {
    setBusy(true); setErr(null)
    try {
      const d = await api.post('/api/auth/demo', { role })
      login(d.user)
      navigate(role === 'learner' ? '/learner' : role === 'trainer' ? '/trainer' : '/admin')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  async function signIn (e) {
    e.preventDefault()
    setErr(null)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErr(t('login.invalid')); return }
    setBusy(true)
    try {
      const d = await api.post('/api/auth/login', { email })
      login(d.user)
      navigate(d.user.role === 'learner' ? '/learner' : d.user.role === 'trainer' ? '/trainer' : '/admin')
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 24px' }}>
        <Link to="/" style={{ textDecoration: 'none' }}><Logo size={34} /></Link>
      </div>
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '0 18px 40px' }}>
        <div style={{ width: '100%', maxWidth: 880 }}>
          <h1 style={{ fontSize: 28, color: 'var(--teal-950)', marginBottom: 6 }}>{t('login.title')}</h1>
          <p style={{ color: 'var(--ink-500)', marginBottom: 26 }}>
            This is a demonstration environment with seeded synthetic accounts. No government SSO is implemented.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {DEMO.map(d => (
              <Card key={d.role} style={{ borderTop: '4px solid var(--teal-600)' }}>
                <div style={{ fontWeight: 800, color: 'var(--teal-900)', fontSize: 16 }}>{t('role.' + d.role)}</div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-700)', margin: '2px 0 2px' }}>{d.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-400)', marginBottom: 14 }}>{d.desc}</div>
                <Button style={{ width: '100%' }} loading={busy} onClick={() => enter(d.role)}>
                  {t('login.demo')} →
                </Button>
              </Card>
            ))}
          </div>

          <Card style={{ marginTop: 22 }}>
            <form onSubmit={signIn} noValidate>
              <Field label={t('login.email') + ' (seeded demo accounts, e.g. priya.nair@demo.statwise.in)'} error={err}>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@demo.statwise.in" style={inputStyle} aria-invalid={Boolean(err)}
                />
              </Field>
              <Button type="submit" variant="secondary" loading={busy}>Sign in with email</Button>
            </form>
          </Card>

          <p style={{ color: 'var(--ink-400)', fontSize: 12.5, marginTop: 18 }}>
            Sessions are HTTP-only signed cookies; roles are enforced server-side on every protected route.
          </p>
        </div>
      </div>
    </div>
  )
}
