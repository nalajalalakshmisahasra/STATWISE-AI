import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState } from '../../components/ui.jsx'

export default function QuizTake () {
  const { id } = useParams()
  const { t } = useApp()
  const [data, setData] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/api/quizzes/${id}`).then(setData).catch(e => setErr(e))
  }, [id])

  async function submit () {
    setBusy(true); setErr(null)
    try {
      const d = await api.post(`/api/quizzes/${id}/attempt`, { answers })
      setResult(d)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  if (err && !data) return <ErrorState message={err.message} onRetry={() => window.location.reload()} />
  if (!data) return <Spinner />

  const answered = Object.keys(answers).length

  return (
    <>
      <PageTitle
        title={data.quiz.title}
        subtitle={`${data.questions.length} questions · topic: ${data.quiz.topic || 'general'}`}
        actions={<Link to="/learner/quizzes"><Button variant="secondary" size="sm">← All quizzes</Button></Link>}
      />
      {err && <div style={{ marginBottom: 14 }}><ErrorState message={err.message} onRetry={() => setErr(null)} /></div>}

      {result && (
        <Card style={{ marginBottom: 20, borderTop: `4px solid ${result.score_pct >= 60 ? 'var(--success)' : 'var(--amber-500)'}` }}>
          <h3 style={{ fontSize: 18, margin: 0 }}>Score: {result.score_pct}% ({result.correct_count}/{result.total_questions})</h3>
          {result.next_step && (
            <p style={{ background: 'var(--teal-100)', borderRadius: 10, padding: '10px 14px', fontSize: 13.8, marginTop: 10 }}>
              <strong>Suggested next step ({result.next_step.action}):</strong> {result.next_step.reason}
            </p>
          )}
          <div style={{ marginTop: 12 }}>
            {result.breakdown.map(b => (
              <div key={b.question_id} style={{ padding: '10px 0', borderBottom: '1px solid var(--ink-100)' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge kind={b.is_correct ? 'green' : 'red'}>{b.is_correct ? 'Correct' : 'Incorrect'}</Badge>
                  {b.competency && <Badge kind="teal">{b.competency}</Badge>}
                  {b.grounding_status === 'insufficient' && <Badge kind="amber">weakly grounded</Badge>}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13.8, margin: '5px 0 2px' }}>{b.prompt}</div>
                <div style={{ fontSize: 13 }}>
                  Your answer: <strong>{Array.isArray(b.your_answer) ? b.your_answer.join(', ') : (b.your_answer == null || b.your_answer === '' ? '—' : String(b.your_answer))}</strong>
                  {!b.is_correct && <span> · Correct: <strong style={{ color: 'var(--success)' }}>{b.correct_answer.join(', ')}</strong></span>}
                </div>
                {b.explanation && <div style={{ fontSize: 12.8, color: 'var(--ink-500)', marginTop: 2 }}>{b.explanation}</div>}
                {b.source_ref && <div style={{ fontSize: 12, color: 'var(--teal-700)', marginTop: 2 }}>Source: {b.source_ref}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 600, color: 'var(--ink-700)' }}>{answered}/{data.questions.length} answered</span>
        <Button onClick={submit} loading={busy} disabled={answered === 0}>{t('action.submit')}</Button>
      </div>

      {data.questions.map((q, i) => {
        const chosen = answers[q.id]
        return (
          <Card key={q.id} as="fieldset" style={{ border: '1px solid var(--ink-100)', marginBottom: 14 }}>
            <legend style={{ fontWeight: 700, fontSize: 14.8, padding: '0 8px' }}>
              {i + 1}. {q.prompt}
            </legend>
            <div style={{ display: 'grid', gap: 7 }}>
              {q.options.map(opt => (
                <label key={opt} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 12px',
                  border: '1.5px solid ' + (chosen === opt ? 'var(--teal-600)' : 'var(--ink-100)'),
                  borderRadius: 10, cursor: 'pointer', background: chosen === opt ? 'var(--teal-100)' : 'var(--white)'
                }}>
                  <input type="radio" name={`q-${q.id}`} checked={chosen === opt} onChange={() => setAnswers(a => ({ ...a, [q.id]: opt }))} style={{ marginTop: 3 }} />
                  <span style={{ fontSize: 14 }}>{opt}</span>
                </label>
              ))}
            </div>
            {q.source_ref && <div style={{ fontSize: 12, color: 'var(--teal-700)', marginTop: 8 }}>Source: {q.source_ref}</div>}
          </Card>
        )
      })}
    </>
  )
}
