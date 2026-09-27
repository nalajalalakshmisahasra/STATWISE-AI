import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useApp } from '../lib/app-context.jsx'
import { LANGUAGES } from '../locales/strings.js'
import { Logo, Button, Card, Field, Badge, inputStyle } from '../components/ui.jsx'

const DEMO = [
  { role: 'learner', name: 'Arjun Mehta', desc: 'Economic Statistician · learner workspace' },
  { role: 'trainer', name: 'Meera Iyer', desc: 'Trainer · NES-2026 Cohort A' },
  { role: 'admin', name: 'Kavya Sharma', desc: 'Administrator · platform analytics' }
]

/** Step 3–5 of the journey: authentication, OTP verification, role selection. */
export default function Login () {
  const { t, login, lang, setLang, user } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin') // signin | register | verify
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [devCode, setDevCode] = useState(null)

  // register form
  const [reg, setReg] = useState({ name: '', email: '', password: '', confirm: '', role: 'learner' })
  const [verify, setVerify] = useState({ email: '', code: '' })

  function roleHome (role) {
    return role === 'learner' ? '/learner' : role === 'trainer' ? '/trainer' : '/admin'
  }

  async function enter (role) {
    setBusy(true); setErr(null)
    try {
      const d = await api.post('/api/auth/demo', { role })
      login(d.user)
      navigate(roleHome(d.user.role))
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  async function signIn (e) {
    e.preventDefault()
    setErr(null)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reg.email)) { setErr(t('login.invalid')); return }
    if (!reg.password) { setErr(t('auth.passwordRequired')); return }
    setBusy(true)
    try {
      const d = await api.post('/api/auth/login', { email: reg.email, password: reg.password })
      login(d.user)
      navigate(roleHome(d.user.role))
    } catch (e2) {
      if (e2.data && e2.data.verification_required) {
        setVerify({ email: e2.data.email, code: '' })
        setDevCode(e2.data.delivery && e2.data.delivery.dev_code)
        setMode('verify')
      } else {
        setErr(e2.message)
      }
    } finally { setBusy(false) }
  }

  async function register (e) {
    e.preventDefault()
    setErr(null)
    if (reg.name.trim().length < 2) { setErr(t('auth.nameRequired')); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reg.email)) { setErr(t('login.invalid')); return }
    if (reg.password.length < 8) { setErr(t('auth.passwordShort')); return }
    if (reg.password !== reg.confirm) { setErr(t('auth.passwordMismatch')); return }
    setBusy(true)
    try {
      const d = await api.post('/api/auth/register', {
        name: reg.name, email: reg.email, password: reg.password, role: reg.role, language: lang
      })
      setVerify({ email: reg.email.toLowerCase().trim(), code: '' })
      setDevCode(d.delivery && d.delivery.dev_code)
      setMode('verify')
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  async function confirmVerify (e) {
    e.preventDefault()
    setErr(null)
    if (!/^\d{6}$/.test(verify.code)) { setErr(t('auth.codeInvalid')); return }
    setBusy(true)
    try {
      const d = await api.post('/api/auth/verify', { email: verify.email, code: verify.code })
      login(d.user)
      // Learners route through onboarding; trainers/admins go straight to their workspace.
      navigate(d.user.role === 'learner' ? '/learner/onboarding' : roleHome(d.user.role))
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  async function resend () {
    setErr(null); setBusy(true)
    try {
      const d = await api.post('/api/auth/resend', { email: verify.email })
      setDevCode(d.delivery && d.delivery.dev_code)
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  const containerStyle = { minHeight: '100dvh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }

  return (
    <div style={containerStyle}>
      <div style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ textDecoration: 'none' }}><Logo size={34} /></Link>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5 }}>
          <span style={{ color: 'var(--ink-500)' }}>{t('lang.label')}</span>
          <select aria-label={t('lang.label')} value={lang} onChange={e => setLang(e.target.value)}
            style={{ padding: '6px 9px', borderRadius: 8, border: '1px solid var(--ink-200)', background: 'var(--white)', fontSize: 13.5, cursor: 'pointer' }}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </label>
      </div>
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '0 18px 40px' }}>
        <div style={{ width: '100%', maxWidth: 880 }}>

          {mode === 'verify'
            ? (
              <Card style={{ maxWidth: 460, margin: '0 auto' }}>
                <h1 style={{ fontSize: 24, color: 'var(--teal-950)', marginBottom: 6 }}>{t('auth.verifyTitle')}</h1>
                <p style={{ color: 'var(--ink-500)', marginBottom: 18, fontSize: 14 }}>
                  {t('auth.verifySub', { email: verify.email })}
                </p>
                {devCode && (
                  <div role="note" style={{ background: 'var(--amber-100)', border: '1px solid var(--amber-500)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13.5 }}>
                    <strong>{t('auth.devOnly')}:</strong> {t('auth.devCodeHint')} <code style={{ fontSize: 16, fontWeight: 800, letterSpacing: 3 }}>{devCode}</code>
                  </div>
                )}
                <form onSubmit={confirmVerify} noValidate>
                  <Field label={t('auth.code')} error={err}>
                    <input
                      inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                      value={verify.code} onChange={e => setVerify(v => ({ ...v, code: e.target.value.replace(/\D/g, '') }))}
                      placeholder="••••••" style={{ ...inputStyle, fontSize: 22, letterSpacing: 8, textAlign: 'center' }}
                      aria-invalid={Boolean(err)}
                    />
                  </Field>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Button type="submit" loading={busy}>{t('auth.verifyBtn')}</Button>
                    <Button variant="ghost" onClick={resend} disabled={busy}>{t('auth.resend')}</Button>
                  </div>
                </form>
              </Card>
              )
            : (
              <>
                <h1 style={{ fontSize: 28, color: 'var(--teal-950)', marginBottom: 6 }}>
                  {mode === 'register' ? t('auth.registerTitle') : t('login.title')}
                </h1>
                <p style={{ color: 'var(--ink-500)', marginBottom: 26 }}>
                  {mode === 'register' ? t('auth.registerSub') : t('login.demoSub')}
                </p>

                {mode === 'register'
                  ? (
                    <Card style={{ maxWidth: 560 }}>
                      <form onSubmit={register} noValidate>
                        <Field label={t('auth.name')} required>
                          <input style={inputStyle} value={reg.name} onChange={e => setReg(r => ({ ...r, name: e.target.value }))} autoComplete="name" />
                        </Field>
                        <Field label={t('login.email')} required>
                          <input type="email" style={inputStyle} value={reg.email} onChange={e => setReg(r => ({ ...r, email: e.target.value }))} autoComplete="email" />
                        </Field>
                        <Field label={t('auth.password')} required hint={t('auth.passwordHint')}>
                          <input type="password" style={inputStyle} value={reg.password} onChange={e => setReg(r => ({ ...r, password: e.target.value }))} autoComplete="new-password" />
                        </Field>
                        <Field label={t('auth.confirmPassword')} required error={err}>
                          <input type="password" style={inputStyle} value={reg.confirm} onChange={e => setReg(r => ({ ...r, confirm: e.target.value }))} autoComplete="new-password" aria-invalid={Boolean(err)} />
                        </Field>
                        <Field label={t('auth.chooseRole')} hint={t('auth.roleHint')}>
                          <div role="radiogroup" aria-label={t('auth.chooseRole')} style={{ display: 'flex', gap: 10 }}>
                            {['learner', 'trainer'].map(r => (
                              <button
                                key={r} type="button" role="radio" aria-checked={reg.role === r}
                                onClick={() => setReg(x => ({ ...x, role: r }))}
                                style={{
                                  flex: 1, padding: '12px 10px', borderRadius: 10, cursor: 'pointer',
                                  border: reg.role === r ? '2px solid var(--teal-700)' : '1px solid var(--ink-200)',
                                  background: reg.role === r ? 'var(--teal-100)' : 'var(--white)',
                                  color: 'var(--ink-900)', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600
                                }}
                              >
                                {t('role.' + r)}
                              </button>
                            ))}
                          </div>
                        </Field>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                          <Button type="submit" loading={busy}>{t('auth.createAccount')}</Button>
                          <Button variant="ghost" onClick={() => { setMode('signin'); setErr(null) }}>{t('auth.backToSignin')}</Button>
                        </div>
                      </form>
                    </Card>
                    )
                  : (
                    <>
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
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 16px' }}>
                            <Field label={t('login.email')} error={err}>
                              <input
                                type="email" value={reg.email} onChange={e => setReg(r => ({ ...r, email: e.target.value }))}
                                placeholder="you@example.com" style={inputStyle} aria-invalid={Boolean(err)} autoComplete="email"
                              />
                            </Field>
                            <Field label={t('auth.password')}>
                              <input type="password" value={reg.password} onChange={e => setReg(r => ({ ...r, password: e.target.value }))} style={inputStyle} autoComplete="current-password" />
                            </Field>
                          </div>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Button type="submit" variant="secondary" loading={busy}>{t('auth.signIn')}</Button>
                            <Button variant="ghost" onClick={() => { setMode('register'); setErr(null) }}>{t('auth.needAccount')}</Button>
                            <Badge kind="amber">{t('auth.demoPasswordNote')}</Badge>
                          </div>
                        </form>
                      </Card>
                    </>
                    )}
              </>
              )}
          {user && mode !== 'verify' && (
            <p style={{ marginTop: 16, fontSize: 13.5 }}>
              <Link to={roleHome(user.role)} style={{ color: 'var(--teal-700)', fontWeight: 600 }}>{t('auth.alreadyIn', { role: t('role.' + user.role) })} →</Link>
            </p>
          )}
          <p style={{ color: 'var(--ink-400)', fontSize: 12.5, marginTop: 18 }}>
            {t('auth.securityNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
