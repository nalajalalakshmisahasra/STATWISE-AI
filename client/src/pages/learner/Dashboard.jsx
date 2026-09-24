import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle, Stat } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState, LevelBadge, ProgressBar } from '../../components/ui.jsx'
import { CompetencyRadar } from '../../components/charts.jsx'

const LEVEL_TO_N = { Beginner: 0, Developing: 1, Proficient: 2, Advanced: 3 }

export default function LearnerDashboard () {
  const { user, t } = useApp()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load () {
    setLoading(true); setErr(null)
    try {
      const [gaps, recs, results, progress] = await Promise.all([
        api.get('/api/gaps/me'),
        api.get('/api/recommendations/me'),
        api.get('/api/assessments/results'),
        api.get('/api/progress/me')
      ])
      setData({ gaps: gaps.gaps, role: gaps.role, recs: recs.recommendations, results: results.results, progress: progress.progress })
    } catch (e) { setErr(e) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  if (loading) return <Spinner />
  if (err) return <ErrorState message={err.message} onRetry={load} />
  if (!data) return null

  const { gaps, role, recs, results, progress } = data
  const openGaps = gaps.filter(g => g.gap > 0)
  const assessed = gaps.filter(g => g.assessed_level)
  const radarItems = gaps.filter(g => g.assessed_level).slice(0, 8).map(g => ({
    label: g.competency,
    level: LEVEL_TO_N[g.assessed_level] ?? 0,
    expected: LEVEL_TO_N[g.expected_level] ?? 1
  }))
  const lastResult = results[0]

  return (
    <>
      <PageTitle
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        subtitle={role ? `Role framework: ${role}` : 'Set your job role in Profile to see role-based expectations.'}
        actions={<Link to="/learner/assessment"><Button>{t('assess.start')}</Button></Link>}
      />

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
        <Stat label="Open gaps" value={openGaps.length} hint="below role expectation" accent="var(--amber-500)" />
        <Stat label="Assessed competencies" value={`${assessed.length}/${gaps.length}`} hint="with assessment evidence" />
        <Stat label="Recommendations" value={recs.length} hint={`${recs.filter(r => r.priority === 'high').length} high priority`} accent="var(--teal-800)" />
        <Stat label="Last score" value={lastResult ? `${lastResult.score_pct}%` : '—'} hint={lastResult ? lastResult.title : 'no assessment yet'} accent="var(--aqua-500)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <Card>
          <h3 style={{ fontSize: 16 }}>Competency overview</h3>
          {radarItems.length >= 3
            ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <CompetencyRadar items={radarItems} />
              </div>
              )
            : (
              <EmptyState title="Not enough evidence yet" hint="Complete an assessment to see your competency chart.">
                <Link to="/learner/assessment"><Button size="sm">{t('assess.start')}</Button></Link>
              </EmptyState>
              )}
          <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: '10px 0 0' }}>
            Solid line: your assessed level · dashed: role expectation. Illustrative framework, not certification.
          </p>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16 }}>Priority gaps</h3>
            <Link to="/learner/gaps" style={{ fontSize: 13.5, fontWeight: 600 }}>Full report →</Link>
          </div>
          {openGaps.length === 0
            ? <EmptyState title="No open gaps" hint="Everything assessed meets role expectations so far." />
            : (
              <div>
                {openGaps.slice(0, 4).map((g, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--ink-100)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{g.competency}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-400)' }}>{g.assessed_level || 'Not assessed'} → {g.expected_level} · {g.domain}</div>
                    </div>
                    <Badge kind={g.gap >= 2 ? 'red' : 'amber'}>{g.gap} level{g.gap > 1 ? 's' : ''}</Badge>
                  </div>
                ))}
              </div>
              )}
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Next steps</h3>
            {recs.length === 0
              ? <p style={{ color: 'var(--ink-500)', fontSize: 13.5, margin: 0 }}>Recommendations appear after an assessment or quiz.</p>
              : (
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                  {recs.slice(0, 3).map(r => (
                    <li key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5 }}>
                      <Badge kind={r.priority === 'high' ? 'red' : r.priority === 'medium' ? 'amber' : 'teal'}>{r.priority}</Badge>
                      <span>
                        <strong>{r.title}</strong>
                        <span style={{ color: 'var(--ink-400)' }}> · {r.competency_name}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                )}
            <Link to="/learner/recommendations"><Button variant="secondary" size="sm" style={{ marginTop: 12 }}>{t('nav.recommendations')} →</Button></Link>
          </div>
        </Card>

        <Card style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 16 }}>Recent activity</h3>
            <Link to="/learner/progress" style={{ fontSize: 13.5, fontWeight: 600 }}>Progress history →</Link>
          </div>
          {progress.length === 0
            ? <EmptyState title="No learning activity yet" hint="Start an assessment or open a recommended resource." />
            : (
              <div>
                {progress.slice(0, 6).map(p => (
                  <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--ink-100)', flexWrap: 'wrap' }}>
                    <Badge kind="teal">{p.record_type}</Badge>
                    <span style={{ fontSize: 13.5, flex: 1, minWidth: 200 }}>{p.note}</span>
                    {p.level_after && <LevelBadge level={p.level_after} />}
                    <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>{String(p.created_at).slice(0, 10)}</span>
                  </div>
                ))}
              </div>
              )}
        </Card>
      </div>
    </>
  )
}
