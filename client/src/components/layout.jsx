import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../lib/app-context.jsx'
import { Logo, Badge, Button, Icon, Card } from './ui.jsx'
import { api } from '../lib/api.js'
import { LANGUAGES } from '../locales/strings.js'

/* ---------------- Language picker ---------------- */

export function LangPicker ({ light, compact }) {
  const { lang, setLang, t } = useApp()
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
      {!compact && <span style={{ color: light ? 'rgba(247,246,242,.7)' : 'var(--ink-500)' }}>{t('lang.label')}</span>}
      <select
        aria-label={t('lang.label')}
        value={lang}
        onChange={e => setLang(e.target.value)}
        style={{
          padding: '6px 9px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          border: '1px solid ' + (light ? 'rgba(247,246,242,.28)' : 'var(--ink-200)'),
          background: light ? 'rgba(255,255,255,.07)' : 'var(--surface)',
          color: light ? 'var(--paper)' : 'var(--ink-900)'
        }}
      >
        {LANGUAGES.map(l => <option key={l.code} value={l.code} style={{ color: 'var(--ink-900)' }}>{l.label}</option>)}
      </select>
    </label>
  )
}

/* ---------------- Public (landing) header ---------------- */

export function LandingHeader () {
  const { t } = useApp()
  return (
    <header style={{ background: 'transparent', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
      <div className="landing-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px' }}>
        <Logo light size={38} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <LangPicker light />
          <a href="#enter" style={{
            color: 'var(--paper)', fontWeight: 600, fontSize: 14, textDecoration: 'none',
            border: '1px solid rgba(247,246,242,.4)', padding: '8px 17px', borderRadius: 999, whiteSpace: 'nowrap',
            backdropFilter: 'blur(6px)'
          }}>
            {t('landing.cta.demo')}
          </a>
        </div>
      </div>
    </header>
  )
}

/* ---------------- Workspace shell ---------------- */

const LEARNER_NAV = [
  { to: '/learner', key: 'nav.dashboard', icon: 'grid', end: true },
  { to: '/learner/assessment', key: 'nav.assessment', icon: 'target' },
  { to: '/learner/gaps', key: 'nav.gaps', icon: 'chart' },
  { to: '/learner/recommendations', key: 'nav.recommendations', icon: 'spark' },
  { to: '/learner/activities', key: 'nav.activities', icon: 'book' },
  { to: '/learner/quizzes', key: 'nav.quizzes', icon: 'puzzle' },
  { to: '/learner/progress', key: 'nav.progress', icon: 'trend' },
  { to: '/learner/assistant', key: 'nav.assistant', icon: 'bell' },
  { to: '/learner/profile', key: 'nav.profile', icon: 'user' }
]

const TRAINER_NAV = [
  { to: '/trainer', key: 'nav.dashboard', icon: 'grid', end: true },
  { to: '/trainer/learners', key: 'nav.learners', icon: 'users' },
  { to: '/trainer/cohort', key: 'nav.cohort', icon: 'chart' },
  { to: '/trainer/review', key: 'nav.review', icon: 'clipboard' },
  { to: '/trainer/quizzes', key: 'nav.quizzes', icon: 'puzzle' }
]

const ADMIN_NAV = [
  { to: '/admin', key: 'nav.analytics', icon: 'chart', end: true },
  { to: '/admin/resources', key: 'nav.resources', icon: 'book' },
  { to: '/admin/framework', key: 'nav.framework', icon: 'target' },
  { to: '/admin/users', key: 'nav.users', icon: 'users' },
  { to: '/admin/integrations', key: 'nav.integrations', icon: 'plug' }
]

const ROLE_THEME = {
  learner: { label: 'role.learner', accent: 'var(--teal-500)', soft: 'rgba(74,168,161,.16)' },
  trainer: { label: 'role.trainer', accent: 'var(--amber-400)', soft: 'rgba(221,170,66,.15)' },
  admin: { label: 'role.admin', accent: '#9db9f5', soft: 'rgba(157,185,245,.14)' }
}

function SidebarContent ({ role, nav, open, onClose, t, user, onLogout, theme }) {
  return (
    <>
      <div style={{ padding: '18px 18px 14px' }}>
        <Logo light size={30} />
      </div>
      <nav aria-label="Primary" style={{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 11,
              color: isActive ? 'var(--paper)' : 'rgba(247,246,242,.62)',
              textDecoration: 'none', fontSize: 13.8, fontWeight: isActive ? 650 : 500,
              padding: '9.5px 12px', borderRadius: 9,
              background: isActive ? theme.soft : 'transparent',
              boxShadow: isActive ? `inset 2.5px 0 0 ${theme.accent}` : 'none',
              whiteSpace: 'nowrap'
            })}
          >
            <Icon name={item.icon} size={17} />
            {t(item.key)}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '14px 16px 18px', borderTop: '1px solid rgba(247,246,242,.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span aria-hidden="true" style={{
            width: 32, height: 32, borderRadius: 99, flexShrink: 0,
            background: theme.soft, color: theme.accent,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-display)'
          }}>
            {(user && user.name ? user.name : '?').slice(0, 1).toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.2, fontWeight: 650, color: 'var(--paper)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user && user.name}
            </div>
            <div style={{ fontSize: 11.3, color: 'rgba(247,246,242,.55)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 650 }}>
              {t(theme.label)}
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="thin-scroll"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
            background: 'rgba(255,255,255,.05)', color: 'rgba(247,246,242,.85)',
            border: '1px solid rgba(247,246,242,.16)', borderRadius: 8,
            padding: '8px 12px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit'
          }}
        >
          <Icon name="logout" size={15} />
          {t('nav.logout')}
        </button>
      </div>
    </>
  )
}

export function WorkspaceShell ({ role, children }) {
  const { user, logout, t } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [unread, setUnread] = useState(0)
  const [drawer, setDrawer] = useState(false)

  const nav = role === 'learner' ? LEARNER_NAV : role === 'trainer' ? TRAINER_NAV : ADMIN_NAV
  const theme = ROLE_THEME[role] || ROLE_THEME.learner

  useEffect(() => {
    let live = true
    api.get('/api/notifications').then(d => { if (live) setUnread(d.unread) }).catch(() => {})
    return () => { live = false }
  }, [])

  // Close the drawer on navigation (mobile)
  useEffect(() => { setDrawer(false) }, [location.pathname])

  async function doLogout () {
    await logout()
    navigate('/')
  }

  const crumb = (() => {
    const item = nav.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))
    return item ? t(item.key) : ''
  })()

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)' }}>
      <a className="skip-link" href="#main-content">Skip to content</a>

      {/* Desktop sidebar */}
      <aside
        aria-label="Sidebar"
        style={{
          position: 'fixed', inset: '0 auto 0 0', width: 246, zIndex: 40,
          display: 'flex', flexDirection: 'column',
          background: 'var(--ink-surface)', color: 'var(--paper)',
          borderRight: '1px solid var(--ink-surface-line)'
        }}
        className="sw-sidebar"
      >
        <SidebarContent role={role} nav={nav} t={t} user={user} onLogout={doLogout} theme={theme} />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} role="dialog" aria-modal="true" aria-label="Navigation">
          <div
            onClick={() => setDrawer(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(8, 24, 23, 0.55)', backdropFilter: 'blur(2px)' }}
          />
          <aside style={{
            position: 'absolute', inset: '0 auto 0 0', width: 262, maxWidth: '82vw',
            background: 'var(--ink-surface)', color: 'var(--paper)',
            display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--shadow-3)', animation: 'sw-fade 0.18s ease both'
          }}>
            <SidebarContent
              role={role} nav={nav} t={t} user={user} onLogout={doLogout} theme={theme}
              onClose={() => setDrawer(false)}
            />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="sw-main" style={{ marginLeft: 246, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        {/* Top bar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(247, 246, 242, 0.88)', backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--ink-100)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 22px' }}>
            <button
              className="sw-burger"
              aria-label="Toggle menu" aria-expanded={drawer}
              onClick={() => setDrawer(o => !o)}
              style={{
                display: 'none', alignItems: 'center', justifyContent: 'center',
                background: 'var(--ink-surface)', border: 'none', color: 'var(--paper)',
                borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 15
              }}
            >
              ☰
            </button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="eyebrow" style={{ fontSize: 10.5 }}>{t('role.' + (role === 'admin' ? 'admin' : role))} workspace</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {crumb}
              </div>
            </div>
            <LangPicker />
            {unread > 0 && <Badge kind="amber" dot>{unread} new</Badge>}
          </div>
        </header>

        <main id="main-content" className="sw-content" style={{
          flex: 1, width: '100%', maxWidth: 'var(--maxw)', margin: '0 auto',
          padding: '28px 24px 70px'
        }}>
          {children}
        </main>

        <footer style={{ padding: '16px 24px 20px', color: 'var(--ink-400)', fontSize: 12.3, borderTop: '1px solid var(--ink-100)' }}>
          {t('footer.demo')}
        </footer>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .sw-sidebar { display: none !important; }
          .sw-main { margin-left: 0 !important; }
          .sw-burger { display: inline-flex !important; }
        }
        @media (max-width: 640px) {
          .sw-content { padding: 18px 14px 60px !important; }
        }
      `}</style>
    </div>
  )
}

/* ---------------- Page header ---------------- */

export function PageTitle ({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="anim-in" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>}
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--ink-500)', margin: '5px 0 0', maxWidth: 640, fontSize: 13.8 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

/* ---------------- Metric card ---------------- */

export function Stat ({ label, value, hint, accent, icon }) {
  return (
    <Card className="anim-in-1" style={{ padding: '16px 18px', flex: '1 1 170px', position: 'relative', overflow: 'hidden' }}>
      <span aria-hidden="true" style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3.5,
        background: accent || 'var(--teal-600)'
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        {icon && <Icon name={icon} size={14.5} color="var(--ink-400)" />}
        <span className="eyebrow" style={{ fontSize: 10.8 }}>{label}</span>
      </div>
      <div className="metric" style={{ fontSize: 30, fontWeight: 800, color: 'var(--ink-950)', lineHeight: 1.1 }}>{value}</div>
      {hint && <div style={{ fontSize: 12.2, color: 'var(--ink-400)', marginTop: 3 }}>{hint}</div>}
    </Card>
  )
}
