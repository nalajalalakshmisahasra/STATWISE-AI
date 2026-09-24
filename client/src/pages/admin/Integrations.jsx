import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState, inputStyle } from '../../components/ui.jsx'

const STATUS_META = {
  demo_data: { label: 'Demo data', kind: 'amber', desc: 'Synthetic sample records only — no live connection.' },
  not_configured: { label: 'Not configured', kind: 'neutral', desc: 'Service boundary exists; credentials not set.' },
  requires_authorization: { label: 'Requires authorization', kind: 'red', desc: 'Needs official authorization before any connection.' },
  live: { label: 'Live', kind: 'green', desc: 'Verified, authenticated connection in use.' }
}

export default function AdminIntegrations () {
  const { t } = useApp()
  const [integrations, setIntegrations] = useState(null)
  const [resources, setResources] = useState(null)
  const [govOnly, setGovOnly] = useState(true)
  const [q, setQ] = useState('')
  const [err, setErr] = useState(null)

  useEffect(() => {
    Promise.all([api.get('/api/integrations'), api.get('/api/resources')])
      .then(([i, r]) => { setIntegrations(i); setResources(r.resources) })
      .catch(e => setErr(e))
  }, [])

  if (err) return <ErrorState message={err.message} onRetry={() => window.location.reload()} />
  if (!integrations || !resources) return <Spinner />

  const govProviders = ['iGOT Karmayogi (sample)', 'NSSTA/TPAC (sample)']
  const govResources = resources.filter(r => govProviders.includes(r.provider))
  const visible = (govOnly ? govResources : resources).filter(r =>
    q === '' || r.title.toLowerCase().includes(q.toLowerCase()) || r.competency_name.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <>
      <PageTitle
        title="Integrations & government resources"
        subtitle="Honest status for every external touchpoint, plus discovery over sample government-ecosystem records."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 26 }}>
        {integrations.integrations.map(i => {
          const meta = STATUS_META[i.status] || STATUS_META.not_configured
          return (
            <Card key={i.key} style={{ borderTop: `4px solid ${i.status === 'live' ? 'var(--success)' : i.status === 'demo_data' ? 'var(--amber-500)' : 'var(--ink-200)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <h3 style={{ fontSize: 15.5, margin: 0 }}>{i.label}</h3>
                <Badge kind={meta.kind}>{meta.label}</Badge>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: 0 }}>{i.detail}</p>
            </Card>
          )
        })}
      </div>

      <Card style={{ marginBottom: 18, background: 'var(--amber-100)', border: '1px solid #ecd9ae' }}>
        <div style={{ fontSize: 13.5, color: 'var(--warn)' }}>
          <strong>Truthful-labelling notice:</strong> no government API, SSO, or endorsement is connected in this prototype.
          iGOT Karmayogi / NSSTA / TPAC entries are synthetic samples demonstrating the discovery journey. Adapter
          boundaries exist in <code>server/</code> for future authorized connections — each will flip to “Live” only after
          real credentials and authorization are verified.
        </div>
      </Card>

      <h2 style={{ fontSize: 17, marginBottom: 10 }}>Government learning resource discovery</h2>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...inputStyle, maxWidth: 300 }}
          placeholder="Search resources…"
          value={q}
          onChange={e => setQ(e.target.value)}
          aria-label="Search resources"
        />
        <Button size="sm" variant={govOnly ? 'primary' : 'secondary'} onClick={() => setGovOnly(true)}>Government ecosystem</Button>
        <Button size="sm" variant={!govOnly ? 'primary' : 'secondary'} onClick={() => setGovOnly(false)}>All resources</Button>
      </div>

      {visible.length === 0
        ? <EmptyState title="No resources match" />
        : (
          <div style={{ display: 'grid', gap: 10 }}>
            {visible.map(r => (
              <Card key={r.id} style={{ padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14 }}>{r.title}</strong>
                    <Badge kind="teal">{r.competency_name}</Badge>
                    <Badge kind="amber">{r.provider}</Badge>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-400)', marginTop: 3 }}>
                    {r.resource_type.replace('_', ' ')}{r.duration_hours ? ` · ${r.duration_hours}h` : ''} · sample record (not a live listing)
                  </div>
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--ink-400)' }}>{r.url}</span>
              </Card>
            ))}
          </div>
          )}
    </>
  )
}
