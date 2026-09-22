import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState, Field, inputStyle, SuccessNote } from '../../components/ui.jsx'

function ReviewEditor ({ q, onSaved }) {
  const [prompt, setPrompt] = useState(q.prompt)
  const [options, setOptions] = useState(q.options)
  const [correct, setCorrect] = useState(q.correct_answer)
  const [explanation, setExplanation] = useState(q.explanation || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function save () {
    setBusy(true); setErr(null)
    try {
      await api.put(`/api/trainer/questions/${q.id}`, {
        prompt, options, correct_answer: correct, explanation, edit_note: 'Trainer edit via review screen'
      })
      onSaved()
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  function setOption (i, v) {
    const next = [...options]
    next[i] = v
    setOptions(next)
    setCorrect(c => c.map(cA => (cA === q.options[i] ? v : cA)))
  }

  return (
    <Card style={{ marginBottom: 14, borderLeft: `4px solid ${q.grounding_status === 'insufficient' ? 'var(--amber-500)' : 'var(--teal-400)'}` }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <Badge kind={q.origin === 'ai_generated' ? 'teal' : 'neutral'}>{q.origin.replace('_', ' ')}</Badge>
        <Badge kind={q.grounding_status === 'insufficient' ? 'amber' : 'green'}>{q.grounding_status}</Badge>
        {q.origin === 'trainer_edited' && <Badge kind="green">trainer edited</Badge>}
      </div>
      <Field label="Question">
        <textarea rows={2} style={inputStyle} value={prompt} onChange={e => setPrompt(e.target.value)} />
      </Field>
      <div style={{ display: 'grid', gap: 8 }}>
        {options.map((o, i) => (
          <label key={i} style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={correct.includes(o)}
              onChange={e => setCorrect(c => (e.target.checked ? [...c, o] : c.filter(x => x !== o)))}
              aria-label="Mark as correct answer"
            />
            <input style={{ ...inputStyle, flex: 1 }} value={o} onChange={e => setOption(i, e.target.value)} />
          </label>
        ))}
      </div>
      <Field label="Explanation shown to learners after attempt">
        <textarea rows={2} style={inputStyle} value={explanation} onChange={e => setExplanation(e.target.value)} />
      </Field>
      {q.source_ref && <p style={{ fontSize: 12.3, color: 'var(--teal-700)', margin: '0 0 10px' }}>Source: {q.source_ref}</p>}
      {err && <ErrorState message={err.message} />}
      <Button size="sm" onClick={save} loading={busy}>Save changes</Button>
    </Card>
  )
}

export default function QuizReview () {
  const { id } = useParams()
  const { t } = useApp()
  const navigate = useNavigate()
  const [queue, setQueue] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [err, setErr] = useState(null)
  const [note, setNote] = useState(null)

  async function loadQueue () {
    const d = await api.get('/api/trainer/review-queue')
    setQueue(d.queue)
    return d.queue
  }

  useEffect(() => {
    loadQueue().catch(e => setErr(e))
  }, [])

  useEffect(() => {
    if (id) {
      api.get(`/api/trainer/quizzes/${id}/review`).then(setQuiz).catch(e => setErr(e))
    } else {
      setQuiz(null)
    }
  }, [id])

  async function decide (decision) {
    try {
      await api.post(`/api/trainer/quizzes/${id}/approve`, { decision })
      setNote(decision === 'published' ? 'Quiz approved and published — learners can now attempt it.' : 'Quiz returned to review.')
      setTimeout(() => { navigate('/trainer/review') }, 900)
    } catch (e) { setErr(e) }
  }

  if (err && !queue) return <ErrorState message={err.message} onRetry={() => window.location.reload()} />

  if (id && quiz) {
    const allApproved = quiz.status === 'published'
    return (
      <>
        <PageTitle
          title={quiz.title}
          subtitle={`Mode: ${quiz.generation_mode === 'ai' ? 'AI-generated' : 'rules-based fallback (not AI)'} · status: ${quiz.status.replace('_', ' ')} · edit answers or wording, then decide`}
          actions={<Button variant="secondary" size="sm" onClick={() => navigate('/trainer/review')}>← Queue</Button>}
        />
        {note && <div style={{ marginBottom: 14 }}><SuccessNote>{note}</SuccessNote></div>}
        {err && <div style={{ marginBottom: 14 }}><ErrorState message={err.message} onRetry={() => setErr(null)} /></div>}
        {quiz.questions.map(q => <ReviewEditor key={q.id} q={q} onSaved={() => api.get(`/api/trainer/quizzes/${id}/review`).then(setQuiz)} />)}
        <Card style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{ fontSize: 13.5, color: 'var(--ink-500)' }}>
            {allApproved ? 'This quiz is published.' : 'Approve to publish for learners, or keep it in review.'}
          </span>
          {!allApproved && <Button variant="secondary" onClick={() => decide('in_review')}>Keep in review</Button>}
          <Button onClick={() => decide('published')}>{t('action.approve')} & publish</Button>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageTitle
        title={t('trainer.queue')}
        subtitle="Generated quizzes land here before learners see them. Edit anything, then approve to publish."
      />
      {!queue && <Spinner />}
      {queue && queue.length === 0 && (
        <EmptyState title="Queue is clear" hint="New generated quizzes appear here for review." />
      )}
      {queue && queue.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          {queue.map(q => (
            <Card key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 15.5, margin: 0 }}>{q.title}</h3>
                  <Badge kind={q.status === 'in_review' ? 'amber' : 'neutral'}>{q.status.replace('_', ' ')}</Badge>
                  <Badge kind={q.generation_mode === 'ai' ? 'green' : 'neutral'}>
                    {q.generation_mode === 'ai' ? 'AI-generated' : 'fallback (not AI)'}
                  </Badge>
                  {q.competency_name && <Badge kind="teal">{q.competency_name}</Badge>}
                </div>
                <div style={{ fontSize: 12.8, color: 'var(--ink-400)', marginTop: 3 }}>
                  {q.question_count} questions · created by {q.created_by_name} · {String(q.created_at).slice(0, 10)}
                </div>
              </div>
              <Button size="sm" onClick={() => navigate(`/trainer/review/${q.id}`)}>Review →</Button>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
