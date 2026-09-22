import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { PageTitle, Stat } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState } from '../../components/ui.jsx'
import { BarChart } from '../../components/charts.jsx'

export default function TrainerDashboard () {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  async function load () {
    setErr(null)
    try {
      const [learners, cohort, queue] = await Promise.all([
        api.get('/api/trainer/learners'),
        api.get('/api/trainer/cohort-gaps'),
        api.get('/api/trainer/review-queue')
      ])
      setData({ learners: learners.learners, cohort, queue: queue.queue })
    } catch (e) { setErr(e) }
  }
  useEffect(() => { load() }, [])

  if (err) return <ErrorState message={err.message} onRetry={load} />
  if (!data) return <Spinner />

  const { learners, cohort, queue } = data
  const gapRows = (cohort.gap_counts || []).slice(0, 6).map(g => ({ label: g.competency, value: g.total_gap }))
  const scored = learners.filter(l => l.avg_score !== null)
  const cohortAvg = scored.length ? Math.round(scored.reduce((s, l) => s + l.avg_score, 0) / scored.length) : null
  const needsSupport = learners.filter(l => l.open_gaps >= 2 || (l.avg_score !== null && l.avg_score < 60))

  return (
    <>
      <PageTitle
        title="Trainer workspace"
        subtitle="Your assigned learners and cohorts — progress, gaps, assignments, and quiz review in one place."
        actions={<Link to="/trainer/learners"><Button size="sm">My learners →</Button></Link>}
      />

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
        <Stat label="Assigned learners" value={learners.length} hint={`${new Set(learners.map(l => l.cohort)).size} cohort(s)`} />
        <Stat label="Cohort avg score" value={cohortAvg !== null ? `${cohortAvg}%` : '—'} hint="across assessments" accent="var(--aqua-500)" />
        <Stat label="Open gaps (cohort)" value={cohort.gap_counts.reduce((s, g) => s + g.total_gap, 0)} hint="level deficits vs role" accent="var(--amber-500)" />
        <Stat label="Review queue" value={queue.length} hint="quizzes awaiting decision" accent="var(--teal-900)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16 }}>Cohort gap distribution</h3>
            <Link to="/trainer/cohort" style={{ fontSize: 13.5, fontWeight: 600 }}>Full analysis →</Link>
          </div>
          {gapRows.length === 0
            ? <EmptyState title="No gap data yet" hint="Learners appear here after completing assessments." />
            : <BarChart data={gapRows} formatValue={v => `${v} lv`} />}
          <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: '10px 0 0' }}>
            Total level-deficit across assigned learners per competency. Drives which activities to assign next.
          </p>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16 }}>Learners needing support</h3>
            <span style={{ fontSize: 12.5, color: 'var(--ink-400)' }}>{needsSupport.length} flagged</span>
          </div>
          {needsSupport.length === 0
            ? <EmptyState title="No learners flagged" hint="Based on open gaps and recent scores." />
            : (
              <div>
                {needsSupport.map(l => (
                  <div key={l.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--ink-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{l.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-400)' }}>{l.cohort} · {l.open_gaps} open gap(s){l.avg_score !== null ? ` · avg ${l.avg_score}%` : ''}</div>
                    </div>
                    <Link to={`/trainer/learners/${l.id}`}><Button size="sm" variant="secondary">Review</Button></Link>
                  </div>
                ))}
              </div>
              )}
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Quiz review queue</h3>
            {queue.length === 0
              ? <p style={{ color: 'var(--ink-500)', fontSize: 13.5, margin: 0 }}>No quizzes awaiting review.</p>
              : queue.slice(0, 4).map(q => (
                <div key={q.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--ink-100)', fontSize: 13.5, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <span>
                    <strong>{q.title}</strong>
                    <span style={{ color: 'var(--ink-400)' }}> · {q.question_count}q · {q.generation_mode === 'ai' ? 'AI' : 'fallback'}</span>
                  </span>
                  <Link to={`/trainer/review/${q.id}`}><Badge kind={q.status === 'in_review' ? 'amber' : 'neutral'}>{q.status.replace('_', ' ')}</Badge></Link>
                </div>
              ))}
            {queue.length > 0 && <Link to="/trainer/review"><Button size="sm" variant="secondary" style={{ marginTop: 10 }}>Open review queue →</Button></Link>}
          </div>
        </Card>
      </div>
    </>
  )
}
