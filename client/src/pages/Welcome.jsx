import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/app-context.jsx'
import { LANGUAGES } from '../locales/strings.js'
import { Logo } from '../components/ui.jsx'

/**
 * Step 1 of the journey: language selection happens BEFORE authentication.
 * The choice persists locally and is applied to the profile after login /
 * registration, so it survives authentication and browser restarts.
 */
export default function Welcome () {
  const { t, lang, setLang, user } = useApp()
  const go = user ? (user.role === 'learner' ? '/learner' : user.role === 'trainer' ? '/trainer' : '/admin') : '/login'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--teal-950)', color: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '22px 24px' }}>
        <Logo light size={38} />
      </div>
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '0 20px 60px' }}>
        <div style={{ width: '100%', maxWidth: 640, textAlign: 'center' }}>
          <h1 style={{ fontSize: 30, lineHeight: 1.2, marginBottom: 10 }}>{t('welcome.title')}</h1>
          <p style={{ color: 'rgba(250,247,240,.75)', marginBottom: 30, fontSize: 15.5 }}>
            {t('welcome.sub')}
          </p>
          <div role="radiogroup" aria-label={t('lang.label')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {LANGUAGES.map(l => (
              <Link
                key={l.code}
                to={go}
                onClick={() => setLang(l.code)}
                role="radio"
                aria-checked={lang === l.code}
                style={{
                  display: 'block', padding: '18px 16px', borderRadius: 14,
                  border: lang === l.code ? '2px solid var(--amber-400)' : '1px solid rgba(250,247,240,.25)',
                  background: lang === l.code ? 'rgba(232,171,74,.12)' : 'rgba(250,247,240,.06)',
                  textDecoration: 'none', color: 'var(--paper)', textAlign: 'left'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 16.5 }}>{l.label}</div>
                <div style={{ fontSize: 13, color: 'rgba(250,247,240,.65)' }}>{l.native}</div>
              </Link>
            ))}
          </div>
          <p style={{ marginTop: 26, fontSize: 13.5, color: 'rgba(250,247,240,.6)' }}>
            {t('welcome.persist')} <Link to={go} style={{ color: 'var(--amber-400)', fontWeight: 700 }}>{t('landing.cta.demo')} →</Link>
          </p>
        </div>
      </div>
      <footer style={{ padding: '16px 20px', textAlign: 'center', fontSize: 12.5, color: 'rgba(250,247,240,.5)' }}>
        {t('footer.demo')}
      </footer>
    </div>
  )
}
