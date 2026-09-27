import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState, LevelBadge, Segmented, Icon } from '../../components/ui.jsx'

export default function Gaps () {
  const { t } = useApp()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [domain, setDomain] = useState('all')

  async function load () {
    setErr(null)
    try { setData(await api.get('/api/gaps/me')) } catch (e) { setErr(e) }
  }
  useEffect(() => { load() }, [])

  if (err) return <ErrorState message={err.message} onRetry={load} />
  if (!data) return <Spinner />

  const gaps = data.gaps.filter(g => domain === 'all' || g.domain === domain)
  const withGap = gaps.filter(g => g.gap > 0)

  return (
    <>
      <PageTitle
        title={t('gaps.title')}
        subtitle={data.role ? `Expected levels come from the illustrative ${data.role} framework. Every row shows its evidence and limitations.` : 'Set a job role in your profile to see expectations.'}
        actions={
          <Segmented
            ariaLabel="Domain filter"
            value={domain}
            onChange={setDomain}
            options={[
              { value: 'all', label: 'All domains' },
              { value: 'Statistical', label: 'Statistical' },
              { value: 'Technical', label: 'Technical' }
            ]}
          />
        }
      />

      {data.gaps.length === 0 && (
        <EmptyState title="No framework data for your role yet" hint="Pick a role in your profile, or take an assessment first.">
          <Link to="/learner/profile"><Button size="sm">Open profile</Button></Link>
        </EmptyState>
      )}

      {withGap.length > 0 && (
        <div style={{
          marginBottom: 18, borderRadius: 'var(--radius-md)', padding: '14px 18px',
          background: 'var(--amber-50)', border: '1px solid var(--amber-300)',
          display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'
        }}>
          <Icon name="chart" size={18} color="var(--amber-600)" />
          <div style={{ flex: 1, minWidth: 220 }}>
            <strong>{withGap.length} competenc{withGap.length === 1 ? 'y is' : 'ies are'} below role expectation.</strong>{' '}
            <span style={{ fontSize: 13.5 }}>Recommendations are pre-matched to these gaps.</span>
          </div>
          <Link to="/learner/recommendations"><Button size="sm" variant="secondary">{t('recs.title')} →</Button></Link>
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {gaps.map((g, i) => (
          <Card key={i} style={{ borderLeft: g.gap > 0 ? '4px solid var(--amber-500)' : '4px solid var(--success)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 15.5, margin: 0 }}>{g.competency}</h3>
                  <Badge kind={g.domain === 'Statistical' ? 'teal' : 'neutral'}>{g.domain}</Badge>
                  {g.relevance === 'core' && <Badge kind="amber">core for role</Badge>}
                </div>
                <p style={{ color: 'var(--ink-500)', fontSize: 13.2, margin: '4px 0 0' }}>{g.description}</p>
              </div>
              <div style={{ textAlign: 'right', minWidth: 150 }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink-400)' }}>Expected: <strong style={{ color: 'var(--ink-700)' }}>{g.expected_level}</strong></div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-400)', margin: '2px 0' }}>Assessed: <LevelBadge level={g.assessed_level} /></div>
                {g.gap === null
                  ? <Badge>not assessed yet</Badge>
                  : g.gap > 0
                    ? <Badge kind={g.gap >= 2 ? 'red' : 'amber'}>gap: {g.gap} level{g.gap > 1 ? 's' : ''}</Badge>
                    : <Badge kind="green">at or above expectation</Badge>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 12, fontSize: 13 }}>
              <div style={{ background: 'var(--ink-50)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-400)', marginBottom: 3 }}>Evidence</div>
                {g.evidence}
              </div>
              <div style={{ background: 'var(--ink-50)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-400)', marginBottom: 3 }}>Limitations</div>
                {g.limitation}
              </div>
              <div style={{ background: 'var(--teal-100)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--teal-800)', marginBottom: 3 }}>Next step</div>
                {g.next_step}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
