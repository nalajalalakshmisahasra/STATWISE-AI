import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState } from '../../components/ui.jsx'

export default function AdminUsers () {
  const { user: me } = useApp()
  const [users, setUsers] = useState(null)
  const [err, setErr] = useState(null)
  const [note, setNote] = useState(null)

  async function load () {
    setErr(null)
    try { setUsers((await api.get('/api/admin/users')).users) } catch (e) { setErr(e) }
  }
  useEffect(() => { load() }, [])

  async function changeRole (id, role) {
    try {
      await api.put(`/api/admin/users/${id}/role`, { role })
      setNote({ kind: 'ok', text: 'Role updated.' })
      await load()
    } catch (e) { setNote({ kind: 'err', text: e.message }) }
  }

  if (err) return <ErrorState message={err.message} onRetry={load} />
  if (!users) return <Spinner />

  return (
    <>
      <PageTitle
        title="Users & roles"
        subtitle="Demo accounts with synthetic identities. Role changes take effect immediately and are enforced server-side."
      />
      {note && (
        <div style={{
          marginBottom: 14, borderRadius: 10, padding: '10px 16px', fontWeight: 600,
          background: note.kind === 'ok' ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: note.kind === 'ok' ? 'var(--success)' : 'var(--danger)'
        }}>{note.text}</div>
      )}
      {users.length === 0
        ? <EmptyState title="No users found" />
        : (
          <Card style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.8, minWidth: 620 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--ink-100)', color: 'var(--ink-500)', fontSize: 12.5 }}>
                    <th style={{ padding: '12px 16px' }}>Name</th>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Department / Role</th>
                    <th style={{ padding: '12px 16px' }}>Platform role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--ink-100)' }}>
                      <td style={{ padding: '11px 16px', fontWeight: 700 }}>{u.name}{me && u.id === me.id && <span style={{ color: 'var(--ink-400)', fontWeight: 400 }}> (you)</span>}</td>
                      <td style={{ padding: '11px 16px', color: 'var(--ink-500)', fontSize: 12.8 }}>{u.email}</td>
                      <td style={{ padding: '11px 16px', color: 'var(--ink-500)', fontSize: 13 }}>
                        {u.department || '—'}{u.job_role ? ` · ${u.job_role}` : ''}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <select
                          value={u.role}
                          onChange={e => changeRole(u.id, e.target.value)}
                          disabled={me && u.id === me.id}
                          aria-label={`Role for ${u.name}`}
                          style={{
                            padding: '6px 10px', borderRadius: 8, border: '1px solid var(--ink-200)',
                            fontSize: 13.2, background: 'var(--white)', cursor: me && u.id === me.id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <option value="learner">learner</option>
                          <option value="trainer">trainer</option>
                          <option value="admin">admin</option>
                        </select>
                        {me && u.id === me.id && <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 3 }}>cannot change own role</div>}
                      </td>
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
