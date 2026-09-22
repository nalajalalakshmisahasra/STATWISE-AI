import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, Field, inputStyle, SuccessNote } from '../../components/ui.jsx'

export default function ActivityDetail () {
  const { id } = useParams()
  const navigate = useNavigate()
  const [act, setAct] = useState(null)
  const [err, setErr] = useState(null)
  const [reflection, setReflection] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/api/activities/${id}`).then(d => setAct(d.activity)).catch(e => setErr(e))
  }, [id])

  async function complete () {
    setBusy(true); setErr(null)
    try {
      const d = await api.post(`/api/activities/${id}/complete`, { reflection })
      setDone(d.nextStep)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  if (err && !act) return <ErrorState message={err.message} onRetry={() => window.location.reload()} />
  if (!act) return <Spinner />

  return (
    <>
      <PageTitle
        title={act.title}
        subtitle={act.competency_name}
        actions={<Button variant="secondary" size="sm" onClick={() => navigate('/learner/activities')}>← {act.activity_type === 'case_study' ? 'All activities' : 'Back'}</Button>}
      />
      {err && <div style={{ marginBottom: 14 }}><ErrorState message={err.message} /></div>}
      {done && (
        <div style={{ marginBottom: 14 }}>
          <SuccessNote>
            Activity recorded. Suggested next step: <strong>{done.action}</strong> — {done.reason}
          </SuccessNote>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card>
          <Badge kind="teal">{act.competency_name}</Badge>
          <h3 style={{ fontSize: 15.5, marginTop: 10 }}>Scenario</h3>
          <p style={{ fontSize: 14, color: 'var(--ink-700)' }}>{act.content.scenario}</p>
          <h3 style={{ fontSize: 15.5 }}>Data</h3>
          <p style={{ fontSize: 13.8, color: 'var(--ink-500)', background: 'var(--ink-50)', borderRadius: 10, padding: '10px 12px' }}>
            {act.content.data}{act.dataset_note ? ` (${act.dataset_note})` : ''}
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-400)' }}>Synthetic case material for demonstration — no real records.</p>
        </Card>

        <Card>
          <h3 style={{ fontSize: 15.5 }}>Work through these questions</h3>
          <ol style={{ margin: '8px 0 16px', paddingLeft: 20, display: 'grid', gap: 8 }}>
            {(act.content.questions || []).map((q, i) => (
              <li key={i} style={{ fontSize: 14 }}>{q}</li>
            ))}
          </ol>
          <Field label="Your reflection / approach" hint="Recorded in your progress history. Minimum 10 characters to submit.">
            <textarea rows={5} style={inputStyle} value={reflection} onChange={e => setReflection(e.target.value)} />
          </Field>
          {reflection.trim().length > 0 && reflection.trim().length < 10 && (
            <p role="alert" style={{ color: 'var(--danger)', fontSize: 12.8, marginTop: -8 }}>Reflection must be at least 10 characters.</p>
          )}
          <Button
            onClick={complete}
            loading={busy}
            disabled={reflection.trim().length < 10 || Boolean(done)}
          >
            {done ? 'Completed ✓' : 'Submit & mark complete'}
          </Button>
        </Card>
      </div>
    </>
  )
}
