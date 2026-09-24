import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Spinner, ErrorState, EmptyState, LevelBadge } from '../../components/ui.jsx'

export default function Progress () {
  const { t } = useApp()
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    api.get('/api/progress/me').then(d => setRows(d.progress)).catch(e => setErr(e))
  }, [])

  if (err) return <ErrorState message={err.message} onRetry={() => window.location.reload()} />
  if (!rows) return <Spinner />

  const byType = {}
  for (const r of rows) byType[r.record_type] = (byType[r.record_type] || 0) + 1

  return (
    <>
      <PageTitle
        title={t('nav.progress')}
        subtitle="Every assessment, activity, quiz, and completed resource is recorded with its level outcome."
      />
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {Object.entries(byType).map(([k, v]) => <Badge key={k} kind="teal">{k}: {v}</Badge>)}
        {rows.length === 0 && <span />}
      </div>
      {rows.length === 0
        ? (
          <EmptyState title="No progress records yet" hint="Complete an assessment, activity, or quiz and it will appear here." />
          )
        : (
          <Card style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.8, minWidth: 640 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--ink-100)', color: 'var(--ink-500)', fontSize: 12.5 }}>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Competency</th>
                    <th style={{ padding: '12px 16px' }}>Detail</th>
                    <th style={{ padding: '12px 16px' }}>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--ink-100)' }}>
                      <td style={{ padding: '11px 16px', color: 'var(--ink-400)', whiteSpace: 'nowrap' }}>{String(r.created_at).slice(0, 10)}</td>
                      <td style={{ padding: '11px 16px' }}><Badge kind={r.record_type === 'assessment' ? 'amber' : 'teal'}>{r.record_type}</Badge></td>
                      <td style={{ padding: '11px 16px', fontWeight: 600 }}>{r.competency_name}</td>
                      <td style={{ padding: '11px 16px', color: 'var(--ink-500)' }}>{r.note}</td>
                      <td style={{ padding: '11px 16px' }}>{r.level_after ? <LevelBadge level={r.level_after} /> : '—'}</td>
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
