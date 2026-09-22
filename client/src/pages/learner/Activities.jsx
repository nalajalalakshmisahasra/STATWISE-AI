import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Spinner, ErrorState, EmptyState, Button } from '../../components/ui.jsx'

export default function Activities () {
  const { t } = useApp()
  const [acts, setActs] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    api.get('/api/activities').then(d => setActs(d.activities)).catch(e => setErr(e))
  }, [])

  if (err) return <ErrorState message={err.message} onRetry={() => window.location.reload()} />
  if (!acts) return <Spinner />

  const assigned = acts.filter(a => a.assigned_to !== null)
  const library = acts.filter(a => a.assigned_to === null)

  const Row = ({ a }) => (
    <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 15.5, margin: 0 }}>{a.title}</h3>
          <Badge kind="teal">{a.competency_name}</Badge>
          <Badge kind={a.activity_type === 'case_study' ? 'amber' : 'neutral'}>{a.activity_type.replace('_', ' ')}</Badge>
          {a.assigned_to !== null && <Badge kind="red">assigned by trainer</Badge>}
        </div>
        {a.due_date && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 3 }}>Due {a.due_date}</div>}
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-500)' }}>{a.dataset_note}</p>
      </div>
      <Link to={`/learner/activities/${a.id}`}>
        <Button variant={a.status === 'completed' ? 'secondary' : 'primary'} size="sm">
          {a.status === 'completed' ? t('action.view') : t('action.start')} →
        </Button>
      </Link>
    </Card>
  )

  return (
    <>
      <PageTitle title={t('nav.activities')} subtitle="Case studies and exercises built on synthetic official-statistics scenarios." />
      {assigned.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>Assigned to you</h2>
          <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
            {assigned.map(a => <Row key={a.id} a={a} />)}
          </div>
        </>
      )}
      <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>Activity library</h2>
      {library.length === 0
        ? <EmptyState title="No activities available" />
        : <div style={{ display: 'grid', gap: 12 }}>{library.map(a => <Row key={a.id} a={a} />)}</div>}
    </>
  )
}
