import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, LevelBadge, Field, inputStyle, SuccessNote } from '../../components/ui.jsx'

export default function AdminFramework () {
  const [comps, setComps] = useState(null)
  const [reqs, setReqs] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null) // {id, description}
  const [note, setNote] = useState(null)
  const [busy, setBusy] = useState(false)

  async function load () {
    setErr(null)
    try {
      const [c, r] = await Promise.all([api.get('/api/competencies'), api.get('/api/competencies/requirements')])
      setComps(c.competencies)
      setReqs(r.requirements)
    } catch (e) { setErr(e) }
  }
  useEffect(() => { load() }, [])

  async function saveDescription () {
    setBusy(true)
    try {
      await api.put(`/api/competencies/${editing.id}`, { description: editing.description })
      setNote({ kind: 'ok', text: 'Competency description updated.' })
      setEditing(null)
      await load()
    } catch (e) { setNote({ kind: 'err', text: e.message }) } finally { setBusy(false) }
  }

  if (err) return <ErrorState message={err.message} onRetry={load} />
  if (!comps || !reqs) return <Spinner />

  const domains = { Statistical: [], Technical: [] }
  for (const c of comps) domains[c.domain].push(c)

  const roles = [...new Set(reqs.map(r => r.job_role))]

  return (
    <>
      <PageTitle
        title="Competency framework"
        subtitle="Illustrative framework for the demo: competencies by domain and expected levels per job role. Not an officially validated framework."
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
        {Object.entries(domains).map(([domain, list]) => (
          <Card key={domain}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 16 }}>{domain} competencies <Badge kind="teal">{list.length}</Badge></h3>
            </div>
            <div>
              {list.map(c => (
                <div key={c.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--ink-100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <strong style={{ fontSize: 14 }}>{c.name}</strong>
                    <code style={{ fontSize: 11, color: 'var(--ink-400)' }}>{c.code}</code>
                  </div>
                  {editing && editing.id === c.id
                    ? (
                      <div style={{ marginTop: 6 }}>
                        <Field label="Description">
                          <textarea rows={2} style={inputStyle} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} />
                        </Field>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button size="sm" onClick={saveDescription} loading={busy}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                        </div>
                      </div>
                      )
                    : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12.8, color: 'var(--ink-500)' }}>{c.description}</span>
                        <Button size="sm" variant="ghost" onClick={() => setEditing({ id: c.id, description: c.description })}>Edit</Button>
                      </div>
                      )}
                </div>
              ))}
            </div>
          </Card>
        ))}

        <Card style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Role expectations matrix</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.3, minWidth: 640 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--ink-100)', color: 'var(--ink-500)', fontSize: 12.3 }}>
                  <th style={{ padding: '10px 12px' }}>Job role</th>
                  <th style={{ padding: '10px 12px' }}>Competency</th>
                  <th style={{ padding: '10px 12px' }}>Domain</th>
                  <th style={{ padding: '10px 12px' }}>Expected level</th>
                  <th style={{ padding: '10px 12px' }}>Relevance</th>
                </tr>
              </thead>
              <tbody>
                {roles.flatMap(role =>
                  reqs.filter(r => r.job_role === role).map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--ink-100)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{role}</td>
                      <td style={{ padding: '9px 12px' }}>{r.name}</td>
                      <td style={{ padding: '9px 12px' }}><Badge kind={r.domain === 'Statistical' ? 'teal' : 'neutral'}>{r.domain}</Badge></td>
                      <td style={{ padding: '9px 12px' }}><LevelBadge level={r.expected_level} /></td>
                      <td style={{ padding: '9px 12px', color: 'var(--ink-500)' }}>{r.relevance}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
