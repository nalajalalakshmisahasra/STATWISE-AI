import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState, SuccessNote } from '../../components/ui.jsx'

const TYPE_ICON = { course: '📘', case_study: '🧩', module: '🛠', video: '🎬', reading: '📄', practice: '✏️' }

export default function Recommendations () {
  const { t } = useApp()
  const [recs, setRecs] = useState(null)
  const [err, setErr] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [note, setNote] = useState(null)
  const [filter, setFilter] = useState('all')

  async function load () {
    setErr(null)
    try {
      const d = await api.get('/api/recommendations/me')
      setRecs(d.recommendations)
    } catch (e) { setErr(e) }
  }
  useEffect(() => { load() }, [])

  async function setStatus (id, status) {
    setBusyId(id); setNote(null)
    try {
      await api.post(`/api/recommendations/${id}/status`, { status })
      setNote(status === 'completed' ? 'Marked complete — your progress record was updated.' : status === 'dismissed' ? 'Recommendation dismissed.' : 'Status updated.')
      await load()
    } catch (e) { setErr(e) } finally { setBusyId(null) }
  }

  if (err && !recs) return <ErrorState message={err.message} onRetry={load} />
  if (!recs) return <Spinner />

  const visible = recs.filter(r => filter === 'all' || r.basis === filter)
  const bases = [
    { key: 'all', label: 'All' },
    { key: 'gap', label: 'Gap-based' },
    { key: 'interest', label: 'Interests' },
    { key: 'adaptive', label: 'Adaptive' }
  ]

  return (
    <>
      <PageTitle
        title={t('recs.title')}
        subtitle="Every recommendation shows why it was suggested, what outcome to expect, and where it comes from. Sample provider entries are labelled."
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {bases.map(b => (
              <Button key={b.key} size="sm" variant={filter === b.key ? 'primary' : 'secondary'} onClick={() => setFilter(b.key)}>{b.label}</Button>
            ))}
          </div>
        }
      />
      {note && <div style={{ marginBottom: 14 }}><SuccessNote>{note}</SuccessNote></div>}
      {err && <div style={{ marginBottom: 14 }}><ErrorState message={err.message} /></div>}

      {visible.length === 0
        ? (
          <EmptyState title="No recommendations in this view" hint="Complete an assessment or a quiz to generate personalized matches." />
          )
        : (
          <div style={{ display: 'grid', gap: 14 }}>
            {visible.map(r => (
              <Card key={r.id} style={{ borderLeft: `4px solid ${r.priority === 'high' ? 'var(--danger)' : r.priority === 'medium' ? 'var(--amber-500)' : 'var(--teal-400)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <span aria-hidden="true">{TYPE_ICON[r.resource_type] || '📘'}</span>
                      <h3 style={{ fontSize: 16, margin: 0 }}>{r.title}</h3>
                      <Badge kind="teal">{r.competency_name}</Badge>
                      <Badge kind={r.source_type === 'verified' ? 'green' : 'neutral'}>
                        {r.source_type === 'verified' ? 'verified source' : 'sample / demo entry'}
                      </Badge>
                      {r.generation_mode && r.generation_mode === 'ai' && <Badge kind="green">AI</Badge>}
                    </div>
                    <p style={{ margin: '6px 0', fontSize: 13.8, color: 'var(--ink-700)' }}>
                      <strong>Why:</strong> {r.rationale}
                    </p>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: 'var(--ink-500)' }}>
                      <span><strong>Provider:</strong> {r.provider}</span>
                      {r.duration_hours && <span><strong>Duration:</strong> {r.duration_hours}h</span>}
                      {r.outcome && <span><strong>Outcome:</strong> {r.outcome}</span>}
                      <span><strong>Basis:</strong> {r.basis}</span>
                    </div>
                    {r.description && <p style={{ margin: '8px 0 0', fontSize: 12.8, color: 'var(--ink-400)' }}>{r.description}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 170 }}>
                    <Badge kind={r.status === 'completed' ? 'green' : r.status === 'in_progress' ? 'amber' : 'neutral'} style={{ alignSelf: 'flex-start' }}>
                      {r.status.replace('_', ' ')}
                    </Badge>
                    {r.status !== 'completed' && (
                      <Button size="sm" loading={busyId === r.id} onClick={() => setStatus(r.id, 'completed')}>{t('action.complete')}</Button>
                    )}
                    {r.status === 'open' && (
                      <Button size="sm" variant="secondary" loading={busyId === r.id} onClick={() => setStatus(r.id, 'in_progress')}>Mark in progress</Button>
                    )}
                    {r.url && r.url.includes('example.gov.in') === false && (
                      <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Open resource ↗</a>
                    )}
                    {r.status !== 'dismissed' && (
                      <button
                        onClick={() => setStatus(r.id, 'dismissed')}
                        style={{ background: 'none', border: 'none', color: 'var(--ink-400)', cursor: 'pointer', fontSize: 12.5, textDecoration: 'underline' }}
                      >
                        Not relevant
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          )}
    </>
  )
}
