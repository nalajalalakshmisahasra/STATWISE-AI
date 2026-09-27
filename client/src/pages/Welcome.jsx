import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/app-context.jsx'
import { LANGUAGES } from '../locales/strings.js'
import { Logo, Icon } from '../components/ui.jsx'

/**
 * Step 1 of the journey: language selection happens BEFORE authentication.
 * Redesigned as a split brand scene — identity + promise on the left,
 * language choice as the primary action on the right.
 */
export default function Welcome () {
  const { t, lang, setLang, user } = useApp()
  const go = user ? (user.role === 'learner' ? '/learner' : user.role === 'trainer' ? '/trainer' : '/admin') : '/login'

  return (
    <div className="ink-scene" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div className="grain" aria-hidden="true" />

      <header style={{ position: 'relative', zIndex: 2, padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo light size={36} />
        <span className="eyebrow" style={{ color: 'rgba(247,246,242,.55)', fontSize: 11 }}>
          {t('landing.cta.learn') === 'How it works' ? 'Competency intelligence' : 'Competency intelligence'}
        </span>
      </header>

      <div style={{
        position: 'relative', zIndex: 2, flex: 1, display: 'grid', gap: 40, alignItems: 'center',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)', maxWidth: 1180, margin: '0 auto',
        padding: '20px 28px 70px', width: '100%'
      }} role="radiogroup" aria-label={t('lang.label')}>
        {/* Brand panel */}
        <div className="anim-in" style={{ maxWidth: 520 }}>
          <div className="eyebrow" style={{ color: 'var(--amber-300)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span aria-hidden="true" style={{ width: 26, height: 1.5, background: 'var(--amber-400)', display: 'inline-block' }} />
            SIH26101 · MoSPI demonstration
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(34px, 4.6vw, 54px)', lineHeight: 1.06,
            letterSpacing: '-0.028em', color: 'var(--paper)', margin: '0 0 18px'
          }}>
            {t('landing.hero.title')}
          </h1>
          <p style={{ color: 'rgba(247,246,242,.78)', fontSize: 15.5, lineHeight: 1.65, maxWidth: 460, margin: '0 0 28px' }}>
            {t('landing.hero.sub')}
          </p>
          <ul aria-label="Platform capabilities" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {[
              'assess.title',
              'gaps.title',
              'recs.title'
            ].map((k, i) => (
              <li key={k} className={`anim-in-${i + 1}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(247,246,242,.85)', fontSize: 14 }}>
                <Icon name="check" size={15} color="var(--teal-300)" />
                {t(k)}
              </li>
            ))}
          </ul>
        </div>

        {/* Language panel */}
        <div className="anim-in-2">
          <div className="panel" style={{
            background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(247,246,242,.14)',
            backdropFilter: 'blur(14px)', padding: '26px 26px 22px', borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-3)'
          }}>
            <h2 style={{ color: 'var(--paper)', fontSize: 21, marginBottom: 4 }}>{t('welcome.title')}</h2>
            <p style={{ color: 'rgba(247,246,242,.68)', fontSize: 13.6, margin: '0 0 20px' }}>{t('welcome.sub')}</p>

            <div style={{ display: 'grid', gap: 9 }}>
              {LANGUAGES.map(l => {
                const active = lang === l.code
                return (
                  <Link
                    key={l.code}
                    to={go}
                    onClick={() => setLang(l.code)}
                    role="radio"
                    aria-checked={active}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      padding: '14px 17px', borderRadius: 'var(--radius-md)',
                      border: active ? '1.5px solid var(--amber-400)' : '1px solid rgba(247,246,242,.16)',
                      background: active ? 'rgba(221,170,66,.13)' : 'rgba(255,255,255,.04)',
                      textDecoration: 'none', color: 'var(--paper)',
                      boxShadow: active ? '0 8px 26px rgba(4, 22, 21, 0.45)' : 'none',
                      transition: 'border-color .16s ease, background-color .16s ease, transform .16s ease'
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'rgba(247,246,242,.4)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'rgba(247,246,242,.16)' }}
                  >
                    <span>
                      <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{l.label}</span>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'rgba(247,246,242,.62)' }}>{l.native}</span>
                    </span>
                    <Icon name="arrow" size={16} color={active ? 'var(--amber-300)' : 'rgba(247,246,242,.4)'} />
                  </Link>
                )
              })}
            </div>

            <p style={{ marginTop: 18, marginBottom: 0, fontSize: 12.8, color: 'rgba(247,246,242,.55)' }}>
              {t('welcome.persist')}
            </p>
          </div>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13.2 }}>
            <Link to={go} style={{ color: 'var(--amber-300)', fontWeight: 650, textDecoration: 'none' }}>
              {t('landing.cta.demo')} →
            </Link>
          </p>
        </div>
      </div>

      <footer style={{ position: 'relative', zIndex: 2, padding: '16px 28px 20px', textAlign: 'center', fontSize: 12.3, color: 'rgba(247,246,242,.5)' }}>
        {t('footer.demo')}
      </footer>

      <style>{`
        @media (max-width: 920px) {
          div[role='radiogroup'][aria-label] { grid-template-columns: 1fr !important; gap: 26px !important; padding-top: 8px !important; }
        }
      `}</style>
    </div>
  )
}
