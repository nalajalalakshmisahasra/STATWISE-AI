import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState, inputStyle } from '../../components/ui.jsx'

export default function TrainerLearners () {
  const { t } = useApp()
  const [learners, setLearners] = useState(null)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')
  const [cohort, setCohort] = useState('all')

  useEffect(() => {
    api.get('/api/trainer/learners').then(d => setLearners(d.learners)).catch(e => setErr(e))
  }, [])

  if (err) return <ErrorState message={err.message} onRetry={() => window.location.reload()} />
  if (!learners) return <Spinner />

  const cohorts = ['all', ...new Set(learners.map(l => l.cohort).filter(Boolean))]
  const visible = learners.filter(l =>
    (cohort === 'all' || l.cohort === cohort) &&
    (q === '' || l.name.toLowerCase().includes(q.toLowerCase()) || (l.department || '').toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <>
      <PageTitle
        title={t('nav.learners')}
        subtitle="Only learners assigned to you are visible — access is scoped server-side."
      />
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...inputStyle, maxWidth: 280 }}
          placeholder="Search by name or department…"
          value={q}
          onChange={e => setQ(e.target.value)}
          aria-label="Search learners"
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {cohorts.map(c => (
            <Button key={c} size="sm" variant={cohort === c ? 'primary' : 'secondary'} onClick={() => setCohort(c)}>
              {c === 'all' ? 'All cohorts' : c}
            </Button>
          ))}
        </div>
      </div>

      {visible.length === 0
        ? <EmptyState title="No learners match" hint="Adjust search or cohort filter." />
        : (
          <Card style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.8, minWidth: 660 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--ink-100)', color: 'var(--ink-500)', fontSize: 12.5 }}>
                    <th style={{ padding: '12px 16px' }}>Learner</th>
                    <th style={{ padding: '12px 16px' }}>Cohort</th>
                    <th style={{ padding: '12px 16px' }}>Role</th>
                    <th style={{ padding: '12px 16px' }}>Open gaps</th>
                    <th style={{ padding: '12px 16px' }}>Avg score</th>
                    <th style={{ padding: '12px 16px' }}>Last activity</th>
                    <th style={{ padding: '12px 16px' }} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--ink-100)' }}>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ fontWeight: 700 }}>{l.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{l.department || '—'}</div>
                      </td>
                      <td style={{ padding: '11px 16px' }}><Badge kind="teal">{l.cohort || '—'}</Badge></td>
                      <td style={{ padding: '11px 16px', color: 'var(--ink-500)' }}>{l.job_role || '—'}</td>
                      <td style={{ padding: '11px 16px' }}>
                        {l.open_gaps > 0 ? <Badge kind={l.open_gaps >= 2 ? 'red' : 'amber'}>{l.open_gaps}</Badge> : <Badge kind="green">0</Badge>}
                      </td>
                      <td style={{ padding: '11px 16px', fontVariantNumeric: 'tabular-nums' }}>{l.avg_score !== null ? `${l.avg_score}%` : '—'}</td>
                      <td style={{ padding: '11px 16px', color: 'var(--ink-400)', fontSize: 12.5 }}>
                        {l.last_activity ? String(l.last_activity).slice(0, 10) : 'never'}
                      </td>
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                        <Link to={`/trainer/learners/${l.id}`}><Button size="sm" variant="secondary">{t('action.view')}</Button></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          )}
    </>
  )
}
