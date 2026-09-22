import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState, LevelBadge, Field, inputStyle, SuccessNote } from '../../components/ui.jsx'

export default function TrainerLearnerDetail () {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [acts, setActs] = useState([])
  const [err, setErr] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [assignId, setAssignId] = useState('')
  const [due, setDue] = useState('')
  const [note, setNote] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load () {
    setErr(null)
    try {
      const [d, a] = await Promise.all([
        api.get(`/api/trainer/learners/${id}`),
        api.get('/api/activities')
      ])
      setData(d)
      setActs(a.activities.filter(x => x.assigned_to === null))
    } catch (e) { setErr(e) }
  }
  useEffect(() => { load() }, [id])

  async function sendFeedback () {
    if (feedback.trim().length < 5) return
    setBusy(true)
    try {
      await api.post('/api/trainer/feedback', { learner_id: Number(id), message: feedback })
      setFeedback('')
      setNote({ kind: 'ok', text: 'Feedback sent to the learner.' })
    } catch (e) { setNote({ kind: 'err', text: e.message }) } finally { setBusy(false) }
  }

  async function assign () {
    if (!assignId) return
    setBusy(true)
    try {
      await api.post('/api/trainer/assign', { learner_id: Number(id), activity_id: Number(assignId), due_date: due || null })
      setAssignId(''); setDue('')
      setNote({ kind: 'ok', text: 'Activity assigned — the learner was notified.' })
      await load()
    } catch (e) { setNote({ kind: 'err', text: e.message }) } finally { setBusy(false) }
  }

  if (err) return <ErrorState message={err.message} onRetry={load} />
  if (!data) return <Spinner />

  const { learner, profile, gaps, results, attempts, assignments } = data
  const openGaps = gaps.filter(g => g.gap > 0)

  return (
    <>
      <PageTitle
        title={learner.name}
        subtitle={`${profile ? (profile.job_role || 'Role not set') : 'No profile'}${profile && profile.department ? ' · ' + profile.department : ''}`}
        actions={<Button variant="secondary" size="sm" onClick={() => navigate('/trainer/learners')}>← All learners</Button>}
      />
      {note && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            background: note.kind === 'ok' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: note.kind === 'ok' ? 'var(--success)' : 'var(--danger)',
            borderRadius: 10, padding: '10px 16px', fontWeight: 600
          }}>{note.text}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <Card>
          <h3 style={{ fontSize: 16 }}>Competency gaps ({openGaps.length} open)</h3>
          {gaps.length === 0
            ? <EmptyState title="No framework data" hint="Learner has no role set." />
            : (
              <div>
                {gaps.map((g, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
                    <div>
                      <div style={{ fontSize: 13.8, fontWeight: 600 }}>{g.competency}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{g.assessed_level || 'not assessed'} → {g.expected_level}</div>
                    </div>
                    {g.gap > 0 ? <Badge kind={g.gap >= 2 ? 'red' : 'amber'}>−{g.gap} lv</Badge> : <Badge kind="green">on track</Badge>}
                  </div>
                ))}
              </div>
              )}
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <h3 style={{ fontSize: 16 }}>Assessments & quizzes</h3>
            {results.length === 0 && attempts.length === 0
              ? <EmptyState title="No results yet" />
              : (
                <div>
                  {results.map(r => (
                    <div key={'r' + r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--ink-100)', fontSize: 13.5 }}>
                      <span>📋 {r.title}</span>
                      <strong style={{ color: r.score_pct >= 60 ? 'var(--success)' : 'var(--danger)' }}>{r.score_pct}%</strong>
                    </div>
                  ))}
                  {attempts.map(a => (
                    <div key={'q' + a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--ink-100)', fontSize: 13.5 }}>
                      <span>✏️ {a.title}</span>
                      <strong style={{ color: a.score_pct >= 60 ? 'var(--success)' : 'var(--danger)' }}>{a.score_pct}%</strong>
                    </div>
                  ))}
                </div>
                )}
          </Card>

          <Card>
            <h3 style={{ fontSize: 16 }}>Assigned activities</h3>
            {assignments.length === 0
              ? <p style={{ color: 'var(--ink-500)', fontSize: 13.5 }}>Nothing assigned yet.</p>
              : assignments.map(a => (
                <div key={a.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--ink-100)', fontSize: 13.5, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>{a.title}</span>
                  <Badge kind={a.status === 'completed' ? 'green' : 'amber'}>{a.status}</Badge>
                </div>
              ))}
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <Field label="Assign an activity">
                <select style={inputStyle} value={assignId} onChange={e => setAssignId(e.target.value)}>
                  <option value="">Choose activity…</option>
                  {acts.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </Field>
              <Field label="Due date (optional)">
                <input type="date" style={inputStyle} value={due} onChange={e => setDue(e.target.value)} />
              </Field>
              <Button size="sm" onClick={assign} loading={busy} disabled={!assignId}>{t_assignLabel()}</Button>
            </div>
          </Card>

          <Card>
            <h3 style={{ fontSize: 16 }}>Send feedback</h3>
            <Field label="Message to learner">
              <textarea rows={3} style={inputStyle} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Specific, encouraging, actionable…" />
            </Field>
            <Button size="sm" variant="secondary" onClick={sendFeedback} loading={busy} disabled={feedback.trim().length < 5}>
              Send feedback
            </Button>
          </Card>
        </div>
      </div>
    </>
  )
}

function t_assignLabel () { return 'Assign to learner' }
