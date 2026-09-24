import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { PageTitle, Stat } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState } from '../../components/ui.jsx'
import { BarChart, Donut, Sparkline, LEVEL_COLORS } from '../../components/charts.jsx'

export default function AdminAnalytics () {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [domain, setDomain] = useState('')
  const [department, setDepartment] = useState('')

  async function load (d = domain, dep = department) {
    setErr(null)
    try {
      const params = new URLSearchParams()
      if (d) params.set('domain', d)
      if (dep) params.set('department', dep)
      setData(await api.get('/api/admin/analytics' + (params.toString() ? `?${params}` : '')))
    } catch (e) { setErr(e) }
  }
  useEffect(() => { load() }, [])

  if (err) return <ErrorState message={err.message} onRetry={() => load()} />
  if (!data) return <Spinner />

  const levelTotals = { Beginner: 0, Developing: 0, Proficient: 0, Advanced: 0 }
  for (const r of data.competency_distribution) levelTotals[r.assessed_level] = (levelTotals[r.assessed_level] || 0) + r.n
  const dist = Object.entries(levelTotals).map(([label, value]) => ({ label, value, color: LEVEL_COLORS[label] }))

  const trendPoints = data.assessment_trend.map(t => t.avg_score)

  return (
    <>
      <PageTitle
        title="Platform analytics"
        subtitle={data.note}
        actions={<Badge kind="amber">{data.illustrative ? 'Illustrative — synthetic demo data' : ''}</Badge>}
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ fontSize: 13.5, color: 'var(--ink-500)' }}>Filters:</strong>
        {['', 'Statistical', 'Technical'].map(d => (
          <Button key={d || 'all'} size="sm" variant={domain === d ? 'primary' : 'secondary'} onClick={() => { setDomain(d); load(d, department) }}>
            {d || 'All domains'}
          </Button>
        ))}
        {data.learners_by_department.map(dep => (
          <Button key={dep.department} size="sm" variant={department === dep.department ? 'primary' : 'secondary'} onClick={() => { setDepartment(dep.department); load(domain, dep.department) }}>
            {dep.department}
          </Button>
        ))}
        {(domain || department) && (
          <Button size="sm" variant="ghost" onClick={() => { setDomain(''); setDepartment(''); load('', '') }}>Clear ✕</Button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
        <Stat label="Learners" value={data.learner_count} hint="synthetic demo accounts" />
        <Stat label="Recommendations completed" value={data.training_completion.recommendations_completed} hint={`${data.training_completion.recommendations_open} still open`} accent="var(--aqua-500)" />
        <Stat label="Activities completed" value={data.training_completion.activities_completed} hint="assigned by trainers" accent="var(--teal-800)" />
        <Stat label="Quiz attempts" value={data.training_completion.quiz_attempts} hint="all published quizzes" accent="var(--amber-500)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <Card>
          <h3 style={{ fontSize: 16 }}>Assessed level distribution</h3>
          {data.competency_distribution.length === 0
            ? <EmptyState title="No assessment data yet" />
            : <Donut data={dist} centerValue={Object.values(levelTotals).reduce((a, b) => a + b, 0)} centerLabel="assessments" />}
        </Card>

        <Card>
          <h3 style={{ fontSize: 16 }}>Competency gaps (level deficits)</h3>
          {data.gaps_by_competency.length === 0
            ? <EmptyState title="No open gaps recorded" />
            : <BarChart data={data.gaps_by_competency.slice(0, 8).map(g => ({ label: g.name, value: g.total_gap }))} formatValue={v => `${v} lv`} />}
        </Card>

        <Card>
          <h3 style={{ fontSize: 16 }}>Learners by department</h3>
          <BarChart
            data={data.learners_by_department.map(d => ({ label: d.department, value: d.learners }))}
            formatValue={v => `${v}`}
          />
        </Card>

        <Card>
          <h3 style={{ fontSize: 16 }}>Assessment trend (avg score by month)</h3>
          {trendPoints.length < 2
            ? <EmptyState title="Not enough trend data yet" hint="More assessments over time will build this chart." />
            : <Sparkline points={trendPoints} width={280} height={60} />}
          <div style={{ fontSize: 12.5, color: 'var(--ink-400)', marginTop: 8 }}>
            {data.assessment_trend.map(t => `${t.month}: ${t.assessments} assessment(s), avg ${t.avg_score}%`).join(' · ') || 'No completed assessments yet.'}
          </div>
        </Card>

        <Card style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: 16 }}>Resource usage (top 10)</h3>
          {data.resource_usage.length === 0
            ? <EmptyState title="No recommendations yet" />
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 560 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--ink-100)', color: 'var(--ink-500)', fontSize: 12.3 }}>
                      <th style={{ padding: '10px 12px' }}>Resource</th>
                      <th style={{ padding: '10px 12px' }}>Competency</th>
                      <th style={{ padding: '10px 12px' }}>Times recommended</th>
                      <th style={{ padding: '10px 12px' }}>Completions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.resource_usage.map(r => (
                      <tr key={r.title} style={{ borderBottom: '1px solid var(--ink-100)' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 600 }}>{r.title}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--ink-500)' }}>{r.competency}</td>
                        <td style={{ padding: '9px 12px', fontVariantNumeric: 'tabular-nums' }}>{r.times_recommended}</td>
                        <td style={{ padding: '9px 12px', fontVariantNumeric: 'tabular-nums' }}>{r.completions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
        </Card>
      </div>
    </>
  )
}
