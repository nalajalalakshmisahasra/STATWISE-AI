import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/app-context.jsx'
import { Logo, Badge, Button, Card } from './ui.jsx'
import { api } from '../lib/api.js'
import { LANGUAGES } from '../locales/strings.js'

function LangPicker ({ light }) {
  const { lang, setLang, t } = useApp()
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5 }}>
      <span style={{ color: light ? 'rgba(250,247,240,.75)' : 'var(--ink-500)' }}>{t('lang.label')}</span>
      <select
        aria-label={t('lang.label')}
        value={lang}
        onChange={e => setLang(e.target.value)}
        style={{
          padding: '6px 9px', borderRadius: 8, border: '1px solid ' + (light ? 'rgba(250,247,240,.35)' : 'var(--ink-200)'),
          background: light ? 'rgba(255,255,255,.08)' : 'var(--white)', color: light ? 'var(--paper)' : 'var(--ink-900)',
          fontSize: 13.5, cursor: 'pointer'
        }}
      >
        {LANGUAGES.map(l => <option key={l.code} value={l.code} style={{ color: 'var(--ink-900)' }}>{l.label}</option>)}
      </select>
    </label>
  )
}

export function LandingHeader () {
  const { t } = useApp()
  return (
    <header style={{ background: 'transparent', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
      <div className="container landing-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px' }}>
        <Logo light size={38} />
        <div className="landing-cta" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <LangPicker light />
          <a href="#enter" style={{ color: 'var(--paper)', fontWeight: 600, fontSize: 14.5, textDecoration: 'none', border: '1px solid rgba(250,247,240,.5)', padding: '8px 16px', borderRadius: 999, whiteSpace: 'nowrap' }}>
            {t('landing.cta.demo')}
          </a>
        </div>
      </div>
    </header>
  )
}

const LEARNER_NAV = [
  { to: '/learner', key: 'nav.dashboard', end: true },
  { to: '/learner/profile', key: 'nav.profile' },
  { to: '/learner/assessment', key: 'nav.assessment' },
  { to: '/learner/gaps', key: 'nav.gaps' },
  { to: '/learner/recommendations', key: 'nav.recommendations' },
  { to: '/learner/activities', key: 'nav.activities' },
  { to: '/learner/quizzes', key: 'nav.quizzes' },
  { to: '/learner/assistant', key: 'nav.assistant' },
  { to: '/learner/progress', key: 'nav.progress' }
]

const TRAINER_NAV = [
  { to: '/trainer', key: 'nav.dashboard', end: true },
  { to: '/trainer/learners', key: 'nav.learners' },
  { to: '/trainer/cohort', key: 'nav.cohort' },
  { to: '/trainer/review', key: 'nav.review' },
  { to: '/trainer/quizzes', key: 'nav.quizzes' }
]

const ADMIN_NAV = [
  { to: '/admin', key: 'nav.analytics', end: true },
  { to: '/admin/resources', key: 'nav.resources' },
  { to: '/admin/framework', key: 'nav.framework' },
  { to: '/admin/users', key: 'nav.users' },
  { to: '/admin/integrations', key: 'nav.integrations' }
]

export function WorkspaceShell ({ role, children }) {
  const { user, logout, t } = useApp()
  const nav = role === 'learner' ? LEARNER_NAV : role === 'trainer' ? TRAINER_NAV : ADMIN_NAV
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let live = true
    api.get('/api/notifications').then(d => { if (live) setUnread(d.unread) }).catch(() => {})
    return () => { live = false }
  }, [])

  const roleLabel = t('role.' + (role === 'admin' ? 'admin' : role))

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--ink-50)' }}>
      <header style={{ background: 'var(--teal-900)', color: 'var(--paper)', position: 'sticky', top: 0, zIndex: 30, boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <button
              aria-label="Toggle menu" aria-expanded={open}
              onClick={() => setOpen(o => !o)}
              style={{ display: 'none', background: 'none', border: '1px solid rgba(250,247,240,.4)', color: 'var(--paper)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 16 }}
              className="nav-burger"
            >☰</button>
            <Logo light size={30} />
            <Badge kind="amber" style={{ background: 'rgba(232,171,74,.18)', color: 'var(--amber-400)' }}>{roleLabel}</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <LangPicker light />
            <span style={{ fontSize: 13.5, opacity: 0.85, whiteSpace: 'nowrap' }}>{user && user.name}</span>
            <Button variant="ghost" size="sm" style={{ color: 'var(--paper)', border: '1px solid rgba(250,247,240,.4)' }} onClick={() => logout().then(() => navigate('/'))}>
              {t('nav.logout')}
            </Button>
          </div>
        </div>
        <nav aria-label="Primary" className={open ? 'nav-open' : ''} style={{
          display: 'flex', gap: 2, padding: '0 14px 8px', overflowX: 'auto', flexWrap: 'nowrap'
        }}>
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                color: 'rgba(250,247,240,.85)',
                textDecoration: 'none',
                fontSize: 13.8,
                fontWeight: 600,
                padding: '7px 12px',
                borderRadius: 8,
                whiteSpace: 'nowrap',
                background: isActive ? 'rgba(255,255,255,.14)' : 'transparent'
              })}
            >
              {t(item.key)}
              {item.key === 'nav.notifications' && unread > 0 && <Badge kind="amber">{unread}</Badge>}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="container" style={{ flex: 1, width: '100%', maxWidth: 1180, margin: '0 auto', padding: '26px 20px 60px' }}>
        {children}
      </main>
      <footer style={{ padding: '18px 20px', textAlign: 'center', color: 'var(--ink-400)', fontSize: 12.5 }}>
        {t('footer.demo')}
      </footer>
      <style>{`
        @media (max-width: 860px) {
          .nav-burger { display: inline-block !important; }
          header nav { display: none; flex-direction: column; }
          header nav.nav-open { display: flex; }
        }
        @media (max-width: 640px) {
          .landing-top { padding: 14px 16px !important; }
          .landing-top > div:last-child { gap: 10px !important; }
        }
      `}</style>
    </div>
  )
}

export function PageTitle ({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: 25, color: 'var(--teal-950)' }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--ink-500)', margin: 0, maxWidth: 640 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function Stat ({ label, value, hint, accent }) {
  return (
    <Card style={{ padding: 16, flex: '1 1 150px', borderLeft: `4px solid ${accent || 'var(--teal-600)'}` }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--teal-900)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>{value}</div>
      {hint && <div style={{ fontSize: 12.5, color: 'var(--ink-400)' }}>{hint}</div>}
    </Card>
  )
}
