import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState, Field, inputStyle, SuccessNote } from '../../components/ui.jsx'

export default function TrainerQuizzes () {
  const { t } = useApp()
  const [quizzes, setQuizzes] = useState(null)
  const [err, setErr] = useState(null)
  const [topic, setTopic] = useState('Sampling')
  const [text, setText] = useState('')
  const [useSample, setUseSample] = useState(true)
  const [busy, setBusy] = useState(false)
  const [gen, setGen] = useState(null)

  async function load () {
    try { setQuizzes((await api.get('/api/trainer/review-queue')).queue) } catch (e) { setErr(e) }
  }
  useEffect(() => { load() }, [])

  async function generate () {
    setBusy(true); setErr(null); setGen(null)
    try {
      const d = await api.post('/api/quizzes/generate', { topic, text, use_sample: useSample })
      setGen(d)
      await load()
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  if (err && !quizzes) return <ErrorState message={err.message} onRetry={load} />
  if (!quizzes) return <Spinner />

  return (
    <>
      <PageTitle
        title="Quiz generation & library"
        subtitle="Generate grounded quizzes from learning documents, review them, and publish. Generation mode is always labelled honestly."
      />
      {err && <div style={{ marginBottom: 14 }}><ErrorState message={err.message} onRetry={() => setErr(null)} /></div>}

      <Card style={{ marginBottom: 20, borderTop: '4px solid var(--teal-600)' }}>
        <h3 style={{ fontSize: 16 }}>Generate from source content</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0 18px' }}>
          <Field label="Topic (competency name)">
            <input style={inputStyle} value={topic} onChange={e => setTopic(e.target.value)} />
          </Field>
          <Field label="Source">
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, paddingTop: 8 }}>
              <input type="checkbox" checked={useSample} onChange={e => setUseSample(e.target.checked)} />
              Use built-in sample document
            </label>
          </Field>
        </div>
        {!useSample && (
          <Field label="Document text (min 40 chars)" hint="In this demo, paste text from .txt/.md/.csv documents. PDF/DOCX extraction is not available.">
            <textarea rows={6} style={inputStyle} value={text} onChange={e => setText(e.target.value)} />
          </Field>
        )}
        <Button onClick={generate} loading={busy} disabled={!useSample && text.trim().length < 40}>
          {t('action.generate')}
        </Button>
        {gen && (
          <div style={{ marginTop: 12 }}>
            <SuccessNote>
              Created “{topic} — generated quiz” with {gen.question_count} questions ({gen.mode === 'ai' ? `live AI: ${gen.model}` : 'rules-based fallback, NOT AI'}). Status: in review.
            </SuccessNote>
          </div>
        )}
      </Card>

      {quizzes.length === 0
        ? <EmptyState title="No quizzes yet" hint="Generate one above." />
        : (
          <div style={{ display: 'grid', gap: 12 }}>
            {quizzes.map(q => (
              <Card key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 15, margin: 0 }}>{q.title}</h3>
                    <Badge kind={q.status === 'published' ? 'green' : q.status === 'in_review' ? 'amber' : 'neutral'}>{q.status.replace('_', ' ')}</Badge>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-400)' }}>{q.question_count} questions · mode: {q.generation_mode}</div>
                </div>
                <Link to={`/trainer/review/${q.id}`}><Button size="sm" variant="secondary">Open review</Button></Link>
              </Card>
            ))}
          </div>
          )}
    </>
  )
}
