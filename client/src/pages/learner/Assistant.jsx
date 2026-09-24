import React, { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Button, Badge, inputStyle } from '../../components/ui.jsx'

const SUGGESTIONS = [
  'Explain how stratification reduces sampling variance',
  'How do weights work in a household survey?',
  'What are SDG indicator tiers?',
  'How should I handle nonresponse in PLFS?',
  'Give me a study plan for price statistics'
]

export default function Assistant () {
  const { t } = useApp()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const endRef = useRef(null)

  useEffect(() => {
    api.get('/api/assistant/history')
      .then(d => setMessages(d.messages.map(m => ({ role: m.role, content: m.content, mode: m.mode }))))
      .catch(() => {})
  }, [])

  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function ask (q) {
    const question = (q || input).trim()
    if (!question || busy) return
    setInput(''); setErr(null); setBusy(true)
    setMessages(m => [...m, { role: 'user', content: question }])
    try {
      const d = await api.post('/api/assistant/ask', { question })
      setMessages(m => [...m, { role: 'assistant', content: d.reply, mode: d.mode, note: d.note }])
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  return (
    <>
      <PageTitle
        title={t('nav.assistant')}
        subtitle="Explanations of statistical concepts, quiz feedback help, revision guidance, and resource navigation. Responses are grounded in general statistical practice — the assistant admits uncertainty rather than inventing official rules."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 16, alignItems: 'start' }}>
        <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 460 }}>
          <div style={{ flex: 1, padding: 18, display: 'grid', gap: 12, alignContent: 'start', background: 'var(--ink-50)' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--ink-400)', padding: '30px 10px' }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>💬</div>
                Ask a question to start. Try one of the suggestions on the right.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', borderRadius: 14, padding: '11px 15px', fontSize: 14,
                  background: m.role === 'user' ? 'var(--teal-800)' : 'var(--white)',
                  color: m.role === 'user' ? '#fff' : 'var(--ink-900)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--ink-100)',
                  boxShadow: 'var(--shadow-sm)', whiteSpace: 'pre-wrap'
                }}>
                  {m.content}
                  {m.mode === 'fallback' && m.role === 'assistant' && (
                    <div style={{ marginTop: 8 }}>
                      <Badge kind="amber" title="">{t('assistant.demo')}</Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div style={{ color: 'var(--ink-400)', fontSize: 13.5 }}>Thinking…</div>}
            <div ref={endRef} />
          </div>
          <form
            onSubmit={e => { e.preventDefault(); ask() }}
            style={{ display: 'flex', gap: 10, padding: 14, borderTop: '1px solid var(--ink-100)', background: 'var(--white)' }}
          >
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t('assistant.placeholder')}
              aria-label="Ask the learning assistant"
            />
            <Button type="submit" loading={busy} disabled={input.trim().length < 3}>{t('action.send')}</Button>
          </form>
        </Card>

        <div style={{ display: 'grid', gap: 12 }}>
          <Card>
            <h3 style={{ fontSize: 14.5 }}>Try asking</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  style={{
                    textAlign: 'left', fontSize: 13, padding: '9px 11px', borderRadius: 10,
                    border: '1px solid var(--ink-100)', background: 'var(--ink-50)', cursor: 'pointer',
                    color: 'var(--teal-800)', fontWeight: 600
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>
          <Card style={{ background: 'var(--amber-100)', border: '1px solid #ecd9ae' }}>
            <div style={{ fontSize: 12.8, color: 'var(--warn)' }}>
              <strong>Honest AI disclosure:</strong> without AI credentials configured, responses come from built-in
              topic notes and are labelled demo. Set <code>AI_PROVIDER</code>, <code>AI_API_KEY</code>, <code>AI_MODEL</code> server-side for live AI.
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
