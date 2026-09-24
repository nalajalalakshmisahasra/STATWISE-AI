import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Button, Badge, Spinner, ErrorState, SuccessNote } from '../../components/ui.jsx'

function QuestionCard ({ q, index, total, value, onChange }) {
  const isMulti = q.question_type === 'multiple'
  const arr = Array.isArray(value) ? value : value ? [value] : []
  return (
    <Card as="fieldset" style={{ border: '1px solid var(--ink-100)', marginBottom: 16 }}>
      <legend style={{ fontWeight: 700, fontSize: 15, padding: '0 8px' }}>
        {index + 1}. {q.prompt}
      </legend>
      <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
        {q.options.map(opt => (
          <label key={opt} style={{
            display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px',
            border: '1.5px solid ' + (arr.includes(opt) ? 'var(--teal-600)' : 'var(--ink-100)'),
            borderRadius: 10, cursor: 'pointer', background: arr.includes(opt) ? 'var(--teal-100)' : 'var(--white)'
          }}>
            <input
              type={isMulti ? 'checkbox' : 'radio'}
              name={`q-${q.id}`}
              checked={arr.includes(opt)}
              onChange={() => {
                if (isMulti) {
                  onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt])
                } else {
                  onChange(opt)
                }
              }}
              style={{ marginTop: 3 }}
            />
            <span style={{ fontSize: 14.2 }}>{opt}</span>
          </label>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-400)' }}>
        {isMulti ? 'Select all that apply' : 'Select one answer'}
      </div>
    </Card>
  )
}

export default function Assessment () {
  const { t } = useApp()
  const [current, setCurrent] = useState(null) // { assessment, questions }
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function load () {
    setLoading(true); setErr(null)
    try {
      const d = await api.get('/api/assessments/current')
      setCurrent(d.assessment ? d : null)
      setAnswers({})
    } catch (e) { setErr(e) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function start () {
    setBusy(true); setErr(null)
    try {
      const d = await api.post('/api/assessments', {})
      setCurrent(d)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  async function submit () {
    setBusy(true); setErr(null)
    try {
      const d = await api.post(`/api/assessments/${current.assessment.id}/submit`, { responses: answers })
      setResult(d)
      setCurrent(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  if (loading) return <Spinner />
  const answeredCount = current ? Object.keys(answers).length : 0

  return (
    <>
      <PageTitle
        title={t('assess.title')}
        subtitle={t('assess.desc') + ' Short sample assessments cannot establish professional competence — results are illustrative.'}
      />
      {err && <div style={{ marginBottom: 14 }}><ErrorState message={err.message} onRetry={() => setErr(null)} /></div>}

      {result && (
        <Card style={{ marginBottom: 20, borderTop: '4px solid var(--teal-600)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 18, margin: 0 }}>Scored: {result.result.score_pct}%</h3>
              <span style={{ color: 'var(--ink-500)', fontSize: 14 }}>{result.result.correct_count} of {result.result.total_questions} correct</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/learner/gaps"><Button variant="secondary" size="sm">View gap report →</Button></Link>
              <Link to="/learner/recommendations"><Button size="sm">{t('nav.recommendations')} →</Button></Link>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8 }}>Question review</h4>
            {result.breakdown.map(b => (
              <div key={b.question_id} style={{ padding: '10px 0', borderBottom: '1px solid var(--ink-100)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge kind={b.is_correct ? 'green' : 'red'}>{b.is_correct ? 'Correct' : 'Incorrect'}</Badge>
                  <Badge kind="teal">{b.competency}</Badge>
                </div>
                <div style={{ fontSize: 13.8, margin: '6px 0 2px', fontWeight: 600 }}>{b.prompt}</div>
                <div style={{ fontSize: 13 }}>
                  Your answer: <strong>{Array.isArray(b.your_answer) ? b.your_answer.join(', ') : String(b.your_answer)}</strong>
                  {!b.is_correct && (
                    <span> · Correct: <strong style={{ color: 'var(--success)' }}>{b.correct_answer.join(', ')}</strong></span>
                  )}
                </div>
                {b.explanation && <div style={{ fontSize: 12.8, color: 'var(--ink-500)', marginTop: 3 }}>{b.explanation}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {current
        ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontWeight: 600, color: 'var(--ink-700)' }}>
                {t('assess.questions', { n: Math.min(answeredCount + 1, current.questions.length), total: current.questions.length })} · {answeredCount} answered
              </span>
              <Button onClick={submit} loading={busy} disabled={answeredCount === 0}>
                {t('action.submit')} assessment
              </Button>
            </div>
            {current.questions.map((q, i) => (
              <QuestionCard
                key={q.id} q={q} index={i} total={current.questions.length}
                value={answers[q.id]}
                onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}
              />
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={submit} loading={busy} disabled={answeredCount === 0} size="lg">
                {t('action.submit')} assessment
              </Button>
            </div>
          </>
          )
        : !result && (
          <Card style={{ textAlign: 'center', padding: 36 }}>
            <h3 style={{ fontSize: 18 }}>Ready for a new assessment?</h3>
            <p style={{ color: 'var(--ink-500)', maxWidth: 480, margin: '6px auto 18px' }}>
              8 questions drawn from the competency bank, mapped to competencies and your role expectations.
            </p>
            <Button size="lg" onClick={start} loading={busy}>{t('assess.start')}</Button>
          </Card>
          )}
    </>
  )
}
