import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle } from '../../components/layout.jsx'
import { Card, Button, Spinner, ErrorState, EmptyState, Badge } from '../../components/ui.jsx'
import { BarChart, Donut, LEVEL_COLORS } from '../../components/charts.jsx'

export default function CohortAnalysis () {
  const { t } = useApp()
  const [cohorts, setCohorts] = useState([])
  const [active, setActive] = useState('all')
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    api.get('/api/trainer/learners')
      .then(d => {
        const cs = [...new Set(d.learners.map(l => l.cohort).filter(Boolean))]
        setCohorts(cs)
      })
      .catch(e => setErr(e))
  }, [])

  async function load (which) {
    setErr(null)
    try {
      const url = which === 'all' ? '/api/trainer/cohort-gaps' : `/api/trainer/cohort-gaps?cohort=${encodeURIComponent(which)}`
      setData(await api.get(url))
    } catch (e) { setErr(e) }
  }
  useEffect(() => { load(active) }, [active])

  const levelBuckets = ['Beginner', 'Developing', 'Proficient', 'Advanced']
  const dist = levelBuckets.map(lv => ({
    label: lv,
    value: (data ? data.distribution : []).filter(d => d.assessed_level === lv).reduce((s, d) => s + d.n, 0),
    color: LEVEL_COLORS[lv]
  }))

  return (
    <>
      <PageTitle
        title={t('nav.cohort')}
        subtitle="Where your cohort stands: level distribution across assessments and ranked competency deficits."
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <Button size="sm" variant={active === 'all' ? 'primary' : 'secondary'} onClick={() => setActive('all')}>All learners</Button>
        {cohorts.map(c => (
          <Button key={c} size="sm" variant={active === c ? 'primary' : 'secondary'} onClick={() => setActive(c)}>{c}</Button>
        ))}
      </div>

      {err && <ErrorState message={err.message} onRetry={() => load(active)} />}
      {!data && !err && <Spinner />}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
          <Card>
            <h3 style={{ fontSize: 16 }}>Assessed levels ({data.learners} learner{data.learners === 1 ? '' : 's'})</h3>
            {data.distribution.length === 0
              ? <EmptyState title="No assessed levels yet" hint="Learners complete assessments to populate this view." />
              : <Donut data={dist} centerValue={data.learners} centerLabel="learners" />}
            <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: '10px 0 0' }}>
              Based on illustrative assessment scoring; not a validated measure of professional competence.
            </p>
          </Card>
          <Card>
            <h3 style={{ fontSize: 16 }}>Competency deficits (ranked)</h3>
            {data.gap_counts.length === 0
              ? <EmptyState title="No open gaps" hint="Everything assessed is at or above role expectation." />
              : <BarChart data={data.gap_counts.slice(0, 8).map(g => ({ label: g.competency, value: g.total_gap }))} formatValue={v => `${v} lv`} />}
          </Card>
          <Card style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: 16 }}>Per-competency level spread</h3>
            {data.distribution.length === 0
              ? <EmptyState title="Nothing to chart yet" />
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
                  {Object.entries(data.distribution.reduce((acc, d) => {
                    acc[d.competency] = acc[d.competency] || []
                    acc[d.competency].push(d)
                    return acc
                  }, {})).map(([comp, rows]) => (
                    <div key={comp} style={{ border: '1px solid var(--ink-100)', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>{comp}</div>
                      {levelBuckets.map(lv => {
                        const row = rows.find(r => r.assessed_level === lv)
                        return row
                          ? <div key={lv} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.8, padding: '2px 0' }}>
                              <span style={{ color: LEVEL_COLORS[lv], fontWeight: 600 }}>{lv}</span>
                              <span style={{ color: 'var(--ink-500)' }}>{row.n} learner{row.n > 1 ? 's' : ''}</span>
                            </div>
                          : null
                      })}
                    </div>
                  ))}
                </div>
                )}
          </Card>
        </div>
      )}
    </>
  )
}
