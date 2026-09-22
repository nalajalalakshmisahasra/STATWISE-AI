import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useApp } from '../lib/app-context.jsx'
import { Logo, Button, Badge } from '../components/ui.jsx'
import { LandingHeader } from '../components/layout.jsx'

function Feature ({ icon, title, children }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <span aria-hidden="true" style={{
          width: 40, height: 40, flexShrink: 0, borderRadius: 11,
          background: 'var(--teal-100)', color: 'var(--teal-800)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 19
        }}>{icon}</span>
        <div>
          <h3 style={{ fontSize: 15.5, marginBottom: 3 }}>{title}</h3>
          <p style={{ margin: 0, color: 'var(--ink-500)', fontSize: 13.8, lineHeight: 1.5 }}>{children}</p>
        </div>
      </div>
    </div>
  )
}

function RoleCard ({ icon, title, points, cta, onEnter, accent }) {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--ink-100)', borderRadius: 'var(--radius-lg)',
      padding: '24px 22px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 14,
      borderTop: `4px solid ${accent}`
    }}>
      <div style={{ fontSize: 26 }}>{icon}</div>
      <h3 style={{ fontSize: 17, margin: 0 }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-500)', fontSize: 13.8, display: 'grid', gap: 5 }}>
        {points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <div style={{ marginTop: 'auto' }}>
        <Button variant="secondary" style={{ width: '100%' }} onClick={() => onEnter(roleNameFromTitle(title))}>{cta}</Button>
      </div>
    </div>
  )
}

function roleNameFromTitle (title) {
  if (title.toLowerCase().includes('learner')) return 'learner'
  if (title.toLowerCase().includes('trainer')) return 'trainer'
  return 'admin'
}

function DashboardPreview () {
  const rows = [
    { name: 'Sampling', level: 65, expected: 75 },
    { name: 'National Accounts', level: 55, expected: 65 },
    { name: 'Python', level: 30, expected: 50 },
    { name: 'Data Visualization', level: 70, expected: 55 }
  ]
  return (
    <div aria-hidden="true" style={{
      background: 'var(--white)', borderRadius: 18, boxShadow: 'var(--shadow-lg)',
      border: '1px solid var(--ink-100)', padding: 20, maxWidth: 470, margin: '0 auto',
      textAlign: 'left'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--teal-900)' }}>Competency profile</span>
        <Badge kind="teal">A. Mehta · Economic Statistician</Badge>
      </div>
      {rows.map(r => (
        <div key={r.name} style={{ marginBottom: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
            <span style={{ color: 'var(--ink-700)', fontWeight: 600 }}>{r.name}</span>
            <span style={{ color: 'var(--ink-400)' }}>{r.level}% vs role target {r.expected}%</span>
          </div>
          <div style={{ position: 'relative', height: 9, background: 'var(--teal-100)', borderRadius: 999 }}>
            <div style={{ position: 'absolute', inset: 0, width: `${r.expected}%`, background: 'transparent', borderRadius: 999 }}>
              <div style={{ position: 'absolute', right: 0, top: -3, bottom: -3, width: 2.5, background: 'var(--amber-500)', borderRadius: 2 }} />
            </div>
            <div style={{ position: 'absolute', inset: 0, width: `${r.level}%`, background: 'linear-gradient(90deg,var(--teal-600),var(--teal-400))', borderRadius: 999 }} />
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <span style={{ fontSize: 11.5, background: 'var(--teal-100)', color: 'var(--teal-800)', padding: '3px 9px', borderRadius: 999, fontWeight: 600 }}>2 priority gaps</span>
        <span style={{ fontSize: 11.5, background: 'var(--amber-100)', color: 'var(--warn)', padding: '3px 9px', borderRadius: 999, fontWeight: 600 }}>4 recommendations</span>
      </div>
    </div>
  )
}

const LOOP = [
  { n: '1', t: 'Profile', d: 'Capture role, department, assignment, experience, and interests.' },
  { n: '2', t: 'Assess', d: 'Take a mapped competency assessment with transparent scoring.' },
  { n: '3', t: 'Gap analysis', d: 'See expected vs assessed levels with evidence and limitations.' },
  { n: '4', t: 'Recommend', d: 'Receive grounded resources from iGOT/NSSTA-style catalogues.' },
  { n: '5', t: 'Learn & practice', d: 'Work through activities, case studies, and generated quizzes.' },
  { n: '6', t: 'Progress', d: 'Results update your profile and refresh the next steps.' }
]

export default function Landing () {
  const { t, login } = useApp()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null)

  async function enterDemo (role) {
    setBusy(role)
    try {
      const d = await api.post('/api/auth/demo', { role })
      login(d.user)
      navigate(role === 'learner' ? '/learner' : role === 'trainer' ? '/trainer' : '/admin')
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ background: 'var(--paper)' }}>
      <LandingHeader />

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(160deg, var(--teal-950) 0%, var(--teal-800) 58%, var(--teal-700) 100%)',
        color: 'var(--paper)',
        padding: '132px 20px 84px',
        position: 'relative', overflow: 'hidden'
      }}>
        <div aria-hidden="true" style={{
          position: 'absolute', right: -140, top: -80, width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,171,74,.16), transparent 62%)'
        }} />
        <div style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,0.85fr)', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Logo size={44} light />
            </div>
            <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--amber-400)', fontWeight: 700, marginBottom: 14 }}>
              {t('tagline')}
            </div>
            <h1 style={{ fontSize: 'clamp(30px, 4.6vw, 52px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 18, lineHeight: 1.08 }}>
              {t('landing.hero.title')}
            </h1>
            <p style={{ fontSize: 17, color: 'rgba(250,247,240,.85)', maxWidth: 540, marginBottom: 28 }}>
              {t('landing.hero.sub')}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Button size="lg" variant="amber" onClick={() => enterDemo('learner')} loading={busy === 'learner'}>
                {t('landing.cta.demo')} →
              </Button>
              <a href="#how" style={{ alignSelf: 'center', color: 'var(--paper)', fontWeight: 600, fontSize: 15, textDecoration: 'none', borderBottom: '1px solid rgba(250,247,240,.5)', paddingBottom: 2 }}>
                {t('landing.cta.learn')}
              </a>
            </div>
            <p style={{ marginTop: 22, fontSize: 12.5, color: 'rgba(250,247,240,.6)' }}>
              Demo workspace · synthetic data · SIH 2026 problem statement SIH26101 context (MoSPI / DIID, Smart Education)
            </p>
          </div>
          <DashboardPreview />
        </div>
      </section>

      {/* Core loop */}
      <section id="how" style={{ padding: '72px 20px', maxWidth: 1140, margin: '0 auto' }}>
        <h2 style={{ fontSize: 30, textAlign: 'center', color: 'var(--teal-950)' }}>One explainable loop</h2>
        <p style={{ textAlign: 'center', color: 'var(--ink-500)', maxWidth: 560, margin: '8px auto 40px' }}>
          Every step produces evidence. Every recommendation explains why. Every number knows where it came from.
        </p>
        <ol style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, margin: 0, padding: 0, counterReset: 'none' }}>
          {LOOP.map(step => (
            <li key={step.n} style={{ background: 'var(--white)', border: '1px solid var(--ink-100)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <span style={{
                display: 'inline-flex', width: 30, height: 30, borderRadius: '50%', alignItems: 'center', justifyContent: 'center',
                background: 'var(--teal-800)', color: '#fff', fontWeight: 800, fontSize: 14, marginBottom: 10
              }}>{step.n}</span>
              <h3 style={{ fontSize: 14.5, marginBottom: 4 }}>{step.t}</h3>
              <p style={{ margin: 0, fontSize: 12.8, color: 'var(--ink-500)', lineHeight: 1.45 }}>{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section style={{ background: 'var(--white)', padding: '72px 20px', borderTop: '1px solid var(--ink-100)', borderBottom: '1px solid var(--ink-100)' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <h2 style={{ fontSize: 30, textAlign: 'center', color: 'var(--teal-950)' }}>Built for the Official Statistical System</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '26px 40px', marginTop: 42 }}>
            <Feature icon="◎" title="Explainable gap analysis">
              Expected vs assessed levels for each competency, with evidence, role relevance, limitations, and a concrete next step — never a bare number.
            </Feature>
            <Feature icon="◈" title="Grounded AI quiz generation">
              Upload a learning document or use the sample. Generated MCQs carry source references and honest labels for AI vs fallback output.
            </Feature>
            <Feature icon="❖" title="Role-aware recommendations">
              Resources chosen from your role, gaps, interests, and quiz performance — with rationale, provider, duration, and priority on every card.
            </Feature>
            <Feature icon="▦" title="Trainer cohort intelligence">
              Gap distribution across your cohorts, learner drill-downs, activity assignment, and a quiz review workflow before anything reaches learners.
            </Feature>
            <Feature icon="◑" title="Administrator analytics">
              Aggregate competency distribution, gaps by domain, training completion, resource usage, and integration status — labelled illustrative, honestly.
            </Feature>
            <Feature icon="⌘" title="Multilingual by design">
              English, Hindi, Telugu, and Tamil interface options with a persistent language choice across the platform.
            </Feature>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="enter" style={{ padding: '76px 20px', maxWidth: 1140, margin: '0 auto' }}>
        <h2 style={{ fontSize: 30, textAlign: 'center', color: 'var(--teal-950)' }}>Three workspaces, one system</h2>
        <p style={{ textAlign: 'center', color: 'var(--ink-500)', maxWidth: 540, margin: '8px auto 40px' }}>
          Each role gets its own navigation, screens, and permissions — enforced on the backend, not just in the interface.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
          <RoleCard
            icon="🎓" accent="var(--teal-600)"
            title={t('landing.for.learners')}
            points={['Profile & competency framework', 'Assessments with transparent scoring', 'Gap report with evidence', 'Recommendations & learning path', 'Activities, case studies, quizzes', 'AI learning assistant']}
            cta={`Enter as ${t('role.learner')}`}
            onEnter={enterDemo}
          />
          <RoleCard
            icon="🧭" accent="var(--amber-500)"
            title={t('landing.for.trainers')}
            points={['Assigned learners & cohorts', 'Cohort gap distribution', 'Learner progress drill-down', 'Activity assignment & feedback', 'Quiz review / edit / approval']}
            cta={`Enter as ${t('role.trainer')}`}
            onEnter={enterDemo}
          />
          <RoleCard
            icon="📊" accent="var(--teal-900)"
            title={t('landing.for.admins')}
            points={['Aggregate competency analytics', 'Domain / department filters', 'Training outcomes & trends', 'Resource & framework management', 'Integration status panel']}
            cta={`Enter as ${t('role.admin')}`}
            onEnter={enterDemo}
          />
        </div>
        <p style={{ textAlign: 'center', color: 'var(--ink-400)', fontSize: 13, marginTop: 26 }}>
          Demo sessions are clearly labelled. No government SSO is implemented; integration states are shown honestly in the platform.
        </p>
      </section>

      {/* Ecosystem strip */}
      <section style={{ background: 'var(--teal-950)', color: 'var(--paper)', padding: '56px 20px' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, marginBottom: 10 }}>Designed for the government learning ecosystem</h2>
          <p style={{ color: 'rgba(250,247,240,.75)', maxWidth: 640, margin: '0 auto 26px' }}>
            STATWISE represents iGOT Karmayogi, Mission Karmayogi, NSSTA and TPAC programme contexts with synthetic
            sample records, modular adapter boundaries, and honest integration status — Demo data, Not configured,
            or Requires authorization.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['iGOT Karmayogi', 'Mission Karmayogi', 'NSSTA / TPAC', 'Open Data APIs'].map(x => (
              <span key={x} style={{
                border: '1px solid rgba(250,247,240,.3)', borderRadius: 999, padding: '7px 16px',
                fontSize: 13.5, fontWeight: 600
              }}>{x}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '34px 20px 40px', color: 'var(--ink-500)' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Logo size={30} />
          <span style={{ fontSize: 12.5 }}>{t('footer.demo')}</span>
          <span style={{ fontSize: 12.5 }}>© 2026 STATWISE · Prototype v1.0</span>
        </div>
      </footer>
    </div>
  )
}
