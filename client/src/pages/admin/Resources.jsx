import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState, Field, inputStyle, SuccessNote } from '../../components/ui.jsx'

const EMPTY_FORM = { title: '', competency_id: '', provider: 'Internal (sample)', source_type: 'demo', resource_type: 'course', duration_hours: '', outcome: '', url: '', description: '' }

export default function AdminResources () {
  const [resources, setResources] = useState(null)
  const [comps, setComps] = useState([])
  const [err, setErr] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [q, setQ] = useState('')

  async function load () {
    setErr(null)
    try {
      const [r, c] = await Promise.all([api.get('/api/admin/resources'), api.get('/api/competencies')])
      setResources(r.resources)
      setComps(c.competencies)
    } catch (e) { setErr(e) }
  }
  useEffect(() => { load() }, [])

  async function create (e) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      await api.post('/api/admin/resources', { ...form, competency_id: Number(form.competency_id), duration_hours: form.duration_hours ? Number(form.duration_hours) : null })
      setForm(EMPTY_FORM)
      setNote({ kind: 'ok', text: 'Resource created.' })
      await load()
    } catch (e2) { setNote({ kind: 'err', text: e2.message }) } finally { setBusy(false) }
  }

  async function setStatus (id, status) {
    try {
      await api.put(`/api/admin/resources/${id}/status`, { status })
      await load()
    } catch (e) { setNote({ kind: 'err', text: e.message }) }
  }

  if (err && !resources) return <ErrorState message={err.message} onRetry={load} />
  if (!resources) return <Spinner />

  const visible = resources.filter(r => q === '' || r.title.toLowerCase().includes(q.toLowerCase()) || r.competency_name.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageTitle
        title={t_resources()}
        subtitle="Manage the learning catalogue. Sample entries are labelled demo; verified entries require documented provenance."
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: 18, alignItems: 'start' }}>
        <div>
          <input
            style={{ ...inputStyle, maxWidth: 320, marginBottom: 14 }}
            placeholder="Search resources…"
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Search resources"
          />
          {visible.length === 0
            ? <EmptyState title="No resources match" />
            : (
              <div style={{ display: 'grid', gap: 10 }}>
                {visible.map(r => (
                  <Card key={r.id} style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 14 }}>{r.title}</strong>
                          <Badge kind="teal">{r.competency_name}</Badge>
                          <Badge kind={r.source_type === 'verified' ? 'green' : 'neutral'}>{r.source_type}</Badge>
                          <Badge kind={r.status === 'published' ? 'green' : r.status === 'pending_review' ? 'amber' : 'red'}>{r.status.replace('_', ' ')}</Badge>
                        </div>
                        <div style={{ fontSize: 12.3, color: 'var(--ink-400)', marginTop: 3 }}>
                          {r.provider} · {r.resource_type}{r.duration_hours ? ` · ${r.duration_hours}h` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {r.status !== 'published' && <Button size="sm" variant="secondary" onClick={() => setStatus(r.id, 'published')}>Publish</Button>}
                        {r.status === 'published' && <Button size="sm" variant="secondary" onClick={() => setStatus(r.id, 'pending_review')}>Hold</Button>}
                        {r.status !== 'retired' && <Button size="sm" variant="danger" onClick={() => setStatus(r.id, 'retired')}>Retire</Button>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              )}
        </div>

        <Card as="form" onSubmit={create}>
          <h3 style={{ fontSize: 16 }}>Add a resource</h3>
          <Field label="Title" required>
            <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label="Competency" required>
            <select style={inputStyle} value={form.competency_id} onChange={e => setForm({ ...form, competency_id: e.target.value })} required>
              <option value="">Select…</option>
              {comps.map(c => <option key={c.id} value={c.id}>{c.name} ({c.domain})</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Provider">
              <input style={inputStyle} value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} />
            </Field>
            <Field label="Source type">
              <select style={inputStyle} value={form.source_type} onChange={e => setForm({ ...form, source_type: e.target.value })}>
                <option value="demo">demo (sample)</option>
                <option value="verified">verified</option>
              </select>
            </Field>
            <Field label="Type">
              <select style={inputStyle} value={form.resource_type} onChange={e => setForm({ ...form, resource_type: e.target.value })}>
                {['course', 'case_study', 'module', 'video', 'reading', 'practice'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Duration (hours)">
              <input type="number" step="0.5" min="0" style={inputStyle} value={form.duration_hours} onChange={e => setForm({ ...form, duration_hours: e.target.value })} />
            </Field>
          </div>
          <Field label="Outcome">
            <input style={inputStyle} value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })} placeholder="What the learner can do afterwards" />
          </Field>
          <Field label="URL">
            <input style={inputStyle} value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Description">
            <textarea rows={2} style={inputStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Button type="submit" loading={busy} disabled={!form.title || !form.competency_id}>Create resource</Button>
        </Card>
      </div>
    </>
  )
}

function t_resources () { return 'Learning resources' }
