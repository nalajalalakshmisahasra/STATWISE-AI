import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApp } from '../../lib/app-context.jsx'
import { PageTitle, Stat } from '../../components/layout.jsx'
import { Card, Badge, Button, Spinner, ErrorState, EmptyState, LevelBadge, Icon, ProgressBar, Section, LevelMeter } from '../../components/ui.jsx'
import { CompetencyRadar, LEVEL_COLORS } from '../../components/charts.jsx'

const LEVEL_TO_N = { Beginner: 0, Developing: 1, Proficient: 2, Advanced: 3 }

const FOCUS_META = {
  onboarding: { icon: 'user', tone: 'amber' },
  assessment: { icon: 'target', tone: 'amber' },
  activity: { icon: 'book', tone: 'teal' },
  gap: { icon: 'chart', tone: 'teal' },
  reassess: { icon: 'trend', tone: 'teal' }
}

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
  const assessedCount = gaps.total - gaps.top.length + gaps.top.filter(g => g.assessed_level).length
  const assessedPct = gaps.total ? Math.round((assessedCount / gaps.total) * 100) : 0
  const firstName = user && user.name ? user.name.split(' ')[0] : 'there'

  const FOCUS_LINKS = {
    onboarding: t('dash.focus.onboarding'),
    assessment: t('dash.focus.assessment'),
    activity: t('dash.focus.activity'),
    gap: t('dash.focus.gap'),
    reassess: t('dash.focus.reassess')
  }
  const fm = (focus && FOCUS_META[focus.action]) || { icon: 'target', tone: 'teal' }

  return (
    <>
      <PageTitle
        eyebrow={profile && profile.job_role ? `${t('dash.roleFramework')} · ${profile.job_role}` : t('dash.setRole')}
        title={`${t('dash.welcome')}, ${firstName}`}
        actions={<Link to="/learner/assessment"><Button>{t('assess.start')}</Button></Link>}
      />

      {/* ---- Focus hero: the single next action, dark for emphasis ---- */}
      {focus && (
        <div role="status" className="ink-scene anim-in" style={{
          display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 24,
          boxShadow: 'var(--shadow-2)'
        }}>
          <span aria-hidden="true" style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: 'rgba(221,170,66,.16)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name={fm.icon} size={21} color="var(--amber-300)" />
          </span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="eyebrow" style={{ color: 'var(--amber-300)', marginBottom: 3 }}>{FOCUS_LINKS[focus.action] || t('dash.focus.next')}</div>
            <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--paper)' }}>{focus.reason}</div>
          </div>
          <Link to={focus.link}>
            <Button variant="amber" size="md">{t('dash.focus.cta')} →</Button>
          </Link>
        </div>
      )}

      {/* ---- Status strip: four key metrics ---- */}
      <div className="anim-in-1" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <Stat label={t('dash.stat.gaps')} value={gaps.open} hint={t('dash.stat.belowExpectation')} accent="var(--amber-500)" icon="chart" />
        <Stat label={t('dash.stat.assessed')} value={`${assessedCount}/${gaps.total}`} hint={t('dash.stat.withEvidence')} accent="var(--teal-600)" icon="check" />
        <Stat label={t('dash.stat.recs')} value={recommendations.length} hint={`${recommendations.filter(r => r.priority === 'high').length} ${t('dash.stat.highPriority')}`} accent="var(--teal-800)" icon="spark" />
        <Stat
          label={t('dash.stat.lastScore')}
          value={last_result ? `${last_result.score_pct}%` : '—'}
          hint={last_result ? last_result.title : t('dash.stat.noAssessment')}
          accent={last_result && last_result.score_pct >= 60 ? 'var(--success)' : 'var(--danger)'}
          icon="trend"
        />
      </div>

      {/* ---- Asymmetric main grid: evidence left (wide), actions right ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 18, marginBottom: 24 }} className="dash-grid">
        {/* Competency profile */}
        <Card className="anim-in-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <h3 style={{ fontSize: 16 }}>{t('dash.competencyOverview')}</h3>
            <Badge kind="outline">{t('dash.radarNote').split('.')[0]}</Badge>
          </div>
          {radarItems.length >= 3
            ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                <CompetencyRadar items={radarItems} />
              </div>
              )
            : (
              <EmptyState title={t('dash.radarEmpty.title')} hint={t('dash.radarEmpty.hint')} icon="target">
                <Link to="/learner/assessment"><Button size="sm">{t('assess.start')}</Button></Link>
              </EmptyState>
              )}
          <div style={{ marginTop: 12, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.entries(LEVEL_COLORS).map(([lvl, color]) => (
              <span key={lvl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-500)' }}>
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />
                {t('level.' + lvl)}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 11.8, color: 'var(--ink-400)', margin: '10px 0 0', textAlign: 'center' }}>
            {t('dash.radarNote')}
          </p>
        </Card>

        {/* Goals / interests + readiness */}
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <Card className="anim-in-3">
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>{t('dash.yourGoals')}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {profile && profile.learning_goals.length
                ? profile.learning_goals.map(g => <Badge key={g} kind="teal">{g}</Badge>)
                : <span style={{ color: 'var(--ink-400)', fontSize: 13 }}>{t('dash.noGoals')}</span>}
            </div>
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>{t('dash.yourInterests')}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile && profile.interests.length
                ? profile.interests.map(i => <Badge key={i} kind="outline">{i}</Badge>)
                : <span style={{ color: 'var(--ink-400)', fontSize: 13 }}>{t('dash.noGoals')}</span>}
            </div>
          </Card>

          <Card className="anim-in-3">
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>{t('dash.readiness')}</h3>
            <ProgressBar value={assessedPct} showValue label={t('dash.readinessHint')} />
            {gaps.top.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>{t('dash.priorityGaps')}</div>
                {gaps.top.slice(0, 3).map((g, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0' }}>
                    <span style={{ fontSize: 13, fontWeight: 550, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.competency}</span>
                    <LevelMeter level0to3={LEVEL_TO_N[g.assessed_level] ?? 0} expected0to3={LEVEL_TO_N[g.expected_level] ?? 1} />
                    <Badge kind={g.gap >= 2 ? 'red' : 'amber'}>{g.gap}{g.gap > 1 ? t('dash.levels') : t('dash.level')}</Badge>
                  </div>
                ))}
              </div>
            )}
            <Link to="/learner/gaps" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 650, marginTop: 10, textDecoration: 'none' }}>
              {t('dash.fullReport')} <Icon name="arrow" size={13} />
            </Link>
          </Card>
        </div>
      </div>

      {/* ---- Recommendations + quizzes row ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 18 }} className="dash-grid">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16 }}>{t('dash.recommended')}</h3>
            <Link to="/learner/recommendations" style={{ fontSize: 13, fontWeight: 650, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {t('nav.recommendations')} <Icon name="arrow" size={13} />
            </Link>
          </div>
          {recommendations.length === 0
            ? <EmptyState title={t('dash.recsAfterAssessment')} icon="spark" />
            : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
                {recommendations.slice(0, 4).map(r => (
                  <li key={r.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)' }}>
                    <Badge kind={r.priority === 'high' ? 'red' : r.priority === 'medium' ? 'amber' : 'teal'}>{r.priority}</Badge>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 650, fontSize: 13.8 }}>{r.title}</div>
                      <div style={{ color: 'var(--ink-400)', fontSize: 12.3 }}>{r.competency_name} · {r.duration_hours}h</div>
                    </div>
                  </li>
                ))}
              </ul>
              )}
        </Card>

        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          {assigned_activities.length > 0 && (
            <Card>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>{t('dash.assigned')}</h3>
              {assigned_activities.map(a => (
                <Link key={a.id} to={`/learner/activities/${a.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '8px 0', borderBottom: '1px solid var(--ink-50)' }}>
                  <div style={{ fontWeight: 650, fontSize: 13.6 }}>{a.title}</div>
                  <div style={{ fontSize: 12.2, color: 'var(--ink-400)' }}>
                    {a.competency_name}{a.due_date ? ` · ${t('dash.due')} ${String(a.due_date).slice(0, 10)}` : ''}
                  </div>
                </Link>
              ))}
            </Card>
          )}
          {quiz_attempts.length > 0 && (
            <Card>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>{t('dash.recentQuizzes')}</h3>
              {quiz_attempts.slice(0, 4).map((q, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--ink-50)' }}>
                  <span style={{ fontSize: 13.2, fontWeight: 550, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</span>
                  <Badge kind={q.score_pct >= 85 ? 'green' : q.score_pct >= 60 ? 'teal' : 'amber'}>{q.score_pct}%</Badge>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {/* ---- Activity timeline ---- */}
      <Card style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16 }}>{t('dash.recentActivity')}</h3>
          <Link to="/learner/progress" style={{ fontSize: 13, fontWeight: 650, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {t('dash.progressHistory')} <Icon name="arrow" size={13} />
          </Link>
        </div>
        {progress.length === 0
          ? <EmptyState title={t('dash.noActivity')} hint={t('dash.noActivityHint')} icon="trend" />
          : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
              {progress.slice(0, 6).map((p, i) => (
                <li key={p.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', position: 'relative', paddingBottom: i === Math.min(5, progress.length - 1) ? 0 : 16 }}>
                  {i < Math.min(5, progress.length - 1) && (
                    <span aria-hidden="true" style={{ position: 'absolute', left: 10.5, top: 24, bottom: 0, width: 1.5, background: 'var(--ink-100)' }} />
                  )}
                  <span aria-hidden="true" style={{
                    width: 22, height: 22, borderRadius: 99, flexShrink: 0, zIndex: 1,
                    background: p.record_type === 'quiz' ? 'var(--amber-100)' : p.record_type === 'resource' ? 'var(--teal-100)' : 'var(--surface-3)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icon name={p.record_type === 'quiz' ? 'puzzle' : p.record_type === 'resource' ? 'book' : 'target'} size={11.5} color="var(--ink-600)" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13.6 }}>{p.note}</span>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      {p.level_after && <LevelBadge level={p.level_after} />}
                      <span className="metric" style={{ fontSize: 11.8, color: 'var(--ink-400)' }}>{String(p.created_at).slice(0, 10)}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            )}
      </Card>

      <style>{`
        @media (max-width: 1020px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
