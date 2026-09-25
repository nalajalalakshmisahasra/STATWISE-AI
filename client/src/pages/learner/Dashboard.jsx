import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle, Stat } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState, LevelBadge } from '../../components/ui.jsx'
import { CompetencyRadar } from '../../components/charts.jsx'

const LEVEL_TO_N = { Beginner: 0, Developing: 1, Proficient: 2, Advanced: 3 }

/** Personalized learner dashboard (spec §7) — backed entirely by /dashboard/me. */
export default function LearnerDashboard () {
  const { user, t } = useApp()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load () {
    setLoading(true); setErr(null)
    try {
      const d = await api.get('/api/dashboard/me')
      setData(d)
    } catch (e) { setErr(e) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  if (loading) return <Spinner />
  if (err) return <ErrorState message={err.message} onRetry={load} />
  if (!data) return null

  const { profile, focus, gaps, last_result, recommendations, quiz_attempts, progress, assigned_activities } = data
  const radarItems = gaps.top.filter(g => g.assessed_level).slice(0, 8).map(g => ({
    label: g.competency,
    level: LEVEL_TO_N[g.assessed_level] ?? 0,
    expected: LEVEL_TO_N[g.expected_level] ?? 1
  }))
  const assessedTotal = data.assessment_count || 0
  const firstName = user && user.name ? user.name.split(' ')[0] : 'there'

  const FOCUS_LINKS = {
    onboarding: t('dash.focus.onboarding'),
    assessment: t('dash.focus.assessment'),
    activity: t('dash.focus.activity'),
    gap: t('dash.focus.gap'),
    reassess: t('dash.focus.reassess')
  }

  return (
    <>
      <PageTitle
        title={`${t('dash.welcome')}, ${firstName}`}
        subtitle={profile && profile.job_role
          ? `${t('dash.roleFramework')}: ${profile.job_role}`
          : t('dash.setRole')}
        actions={<Link to="/learner/assessment"><Button>{t('assess.start')}</Button></Link>}
      />

      {focus && (
        <div role="status" style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          background: 'var(--teal-100)', border: '1px solid var(--teal-600)', borderRadius: 14,
          padding: '14px 18px', marginBottom: 22
        }}>
          <Badge kind="teal">{FOCUS_LINKS[focus.action] || t('dash.focus.next')}</Badge>
          <span style={{ flex: 1, minWidth: 220, fontSize: 14.5, color: 'var(--teal-950)', fontWeight: 600 }}>{focus.reason}</span>
          <Link to={focus.link}><Button size="sm">{t('dash.focus.cta')} →</Button></Link>
        </div>
      )}

      {profile && (profile.learning_goals.length > 0 || profile.interests.length > 0) && (
        <Card style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <h3 style={{ fontSize: 14.5, margin: '0 0 8px' }}>{t('dash.yourGoals')}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile.learning_goals.length
                  ? profile.learning_goals.map(g => <Badge key={g} kind="teal">{g}</Badge>)
                  : <span style={{ color: 'var(--ink-400)', fontSize: 13.5 }}>{t('dash.noGoals')}</span>}
              </div>
            </div>
            <div style={{ flex: '1 1 260px' }}>
              <h3 style={{ fontSize: 14.5, margin: '0 0 8px' }}>{t('dash.yourInterests')}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile.interests.length
                  ? profile.interests.map(i => <Badge key={i}>{i}</Badge>)
                  : <span style={{ color: 'var(--ink-400)', fontSize: 13.5 }}>{t('dash.noGoals')}</span>}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
        <Stat label={t('dash.stat.gaps')} value={gaps.open} hint={t('dash.stat.belowExpectation')} accent="var(--amber-500)" />
        <Stat label={t('dash.stat.assessed')} value={`${gaps.total - gaps.top.length + gaps.top.filter(g => g.assessed_level).length}/${gaps.total}`} hint={t('dash.stat.withEvidence')} />
        <Stat label={t('dash.stat.recs')} value={recommendations.length} hint={`${recommendations.filter(r => r.priority === 'high').length} ${t('dash.stat.highPriority')}`} accent="var(--teal-800)" />
        <Stat
          label={t('dash.stat.lastScore')}
          value={last_result ? `${last_result.score_pct}%` : '—'}
          hint={last_result ? last_result.title : t('dash.stat.noAssessment')}
          accent="var(--aqua-500)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <Card>
          <h3 style={{ fontSize: 16 }}>{t('dash.competencyOverview')}</h3>
          {radarItems.length >= 3
            ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <CompetencyRadar items={radarItems} />
              </div>
              )
            : (
              <EmptyState title={t('dash.radarEmpty.title')} hint={t('dash.radarEmpty.hint')}>
                <Link to="/learner/assessment"><Button size="sm">{t('assess.start')}</Button></Link>
              </EmptyState>
              )}
          <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: '10px 0 0' }}>
            {t('dash.radarNote')}
          </p>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16 }}>{t('dash.priorityGaps')}</h3>
            <Link to="/learner/gaps" style={{ fontSize: 13.5, fontWeight: 600 }}>{t('dash.fullReport')} →</Link>
          </div>
          {gaps.top.length === 0
            ? <EmptyState title={t('dash.noGaps')} hint={t('dash.noGapsHint')} />
            : (
              <div>
                {gaps.top.map((g, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--ink-100)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{g.competency}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-400)' }}>{g.assessed_level || t('level.notAssessed')} → {g.expected_level} · {g.domain}</div>
                    </div>
                    <Badge kind={g.gap >= 2 ? 'red' : 'amber'}>{g.gap} {g.gap > 1 ? t('dash.levels') : t('dash.level')}</Badge>
                  </div>
                ))}
              </div>
              )}
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>{t('dash.recommended')}</h3>
            {recommendations.length === 0
              ? <p style={{ color: 'var(--ink-500)', fontSize: 13.5, margin: 0 }}>{t('dash.recsAfterAssessment')}</p>
              : (
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                  {recommendations.slice(0, 3).map(r => (
                    <li key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5 }}>
                      <Badge kind={r.priority === 'high' ? 'red' : r.priority === 'medium' ? 'amber' : 'teal'}>{r.priority}</Badge>
                      <span>
                        <strong>{r.title}</strong>
                        <span style={{ color: 'var(--ink-400)' }}> · {r.competency_name}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                )}
            <Link to="/learner/recommendations"><Button variant="secondary" size="sm" style={{ marginTop: 12 }}>{t('nav.recommendations')} →</Button></Link>
          </div>
        </Card>

        {assigned_activities.length > 0 && (
          <Card>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>{t('dash.assigned')}</h3>
            {assigned_activities.map(a => (
              <Link key={a.id} to={`/learner/activities/${a.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '9px 0', borderBottom: '1px solid var(--ink-100)' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-400)' }}>
                  {a.competency_name}{a.due_date ? ` · ${t('dash.due')} ${String(a.due_date).slice(0, 10)}` : ''}
                </div>
              </Link>
            ))}
          </Card>
        )}

        {quiz_attempts.length > 0 && (
          <Card>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>{t('dash.recentQuizzes')}</h3>
            {quiz_attempts.slice(0, 4).map((q, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--ink-100)' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{q.title}</span>
                <Badge kind={q.score_pct >= 85 ? 'green' : q.score_pct >= 60 ? 'teal' : 'amber'}>{q.score_pct}%</Badge>
              </div>
            ))}
          </Card>
        )}

        <Card style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 16 }}>{t('dash.recentActivity')}</h3>
            <Link to="/learner/progress" style={{ fontSize: 13.5, fontWeight: 600 }}>{t('dash.progressHistory')} →</Link>
          </div>
          {progress.length === 0
            ? <EmptyState title={t('dash.noActivity')} hint={t('dash.noActivityHint')} />
            : (
              <div>
                {progress.slice(0, 6).map(p => (
                  <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--ink-100)', flexWrap: 'wrap' }}>
                    <Badge kind="teal">{p.record_type}</Badge>
                    <span style={{ fontSize: 13.5, flex: 1, minWidth: 200 }}>{p.note}</span>
                    {p.level_after && <LevelBadge level={p.level_after} />}
                    <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>{String(p.created_at).slice(0, 10)}</span>
                  </div>
                ))}
              </div>
              )}
        </Card>
      </div>
    </>
  )
}
