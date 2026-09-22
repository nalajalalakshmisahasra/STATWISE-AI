import React from 'react'

/** Horizontal bar chart with category labels. data: [{label, value, color?}] */
export function BarChart ({ data, max, height = 26, formatValue }) {
  const maxValue = max || Math.max(...data.map(d => d.value), 1)
  return (
    <div role="img" aria-label={data.map(d => `${d.label}: ${formatValue ? formatValue(d.value) : d.value}`).join('; ')}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 190px) 1fr 52px', alignItems: 'center', gap: 10, marginBottom: 7 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-700)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.label}>{d.label}</span>
          <span style={{ background: 'var(--teal-100)', borderRadius: 6, height, position: 'relative', overflow: 'hidden', display: 'block' }}>
            <span style={{
              position: 'absolute', inset: 0, width: `${(d.value / maxValue) * 100}%`,
              background: d.color || 'linear-gradient(90deg, var(--teal-600), var(--teal-400))',
              borderRadius: 6, transition: 'width .5s ease', display: 'block'
            }} />
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-500)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {formatValue ? formatValue(d.value) : d.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Donut showing composition of levels. data: [{label, value, color}] */
export function Donut ({ data, size = 148, thickness = 20, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <svg width={size} height={size} role="img" aria-label={data.map(d => `${d.label}: ${d.value}`).join(', ')} style={{ flexShrink: 0 }}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, i) => {
            const frac = d.value / total
            const dash = frac * c
            const el = (
              <circle key={i}
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={d.color} strokeWidth={thickness}
                strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            )
            offset += dash
            return el
          })}
        </g>
        <text x="50%" y="47%" textAnchor="middle" fontWeight="800" fontSize={size * 0.19} fill="var(--teal-900)">{centerValue}</text>
        <text x="50%" y="62%" textAnchor="middle" fontSize={size * 0.085} fill="var(--ink-500)">{centerLabel}</text>
      </svg>
      <div>
        {data.filter(d => d.value > 0).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 13 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: d.color, display: 'inline-block' }} />
            <span style={{ color: 'var(--ink-700)' }}>{d.label}</span>
            <span style={{ color: 'var(--ink-400)', fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Small sparkline for trend rows. points: number[] */
export function Sparkline ({ points, width = 130, height = 34, color = 'var(--teal-600)' }) {
  if (!points || points.length < 2) return <span style={{ color: 'var(--ink-400)', fontSize: 12.5 }}>—</span>
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = width / (points.length - 1)
  const coords = points.map((p, i) => `${(i * step).toFixed(1)},${(height - 4 - ((p - min) / span) * (height - 8)).toFixed(1)}`)
  return (
    <svg width={width} height={height} role="img" aria-label={`Trend: ${points.join(', ')}`}>
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1].split(',')[0]} cy={coords[coords.length - 1].split(',')[1]} r="3" fill={color} />
    </svg>
  )
}

export const LEVEL_COLORS = {
  Beginner: '#c96b62',
  Developing: '#e8ab4a',
  Proficient: '#2c9691',
  Advanced: '#2c7a4b'
}

/** Radar/spider chart for competency levels. items: [{label, level0to3, expected0to3}] */
export function CompetencyRadar ({ items, size = 260 }) {
  const cx = size / 2
  const cy = size / 2
  const rMax = size / 2 - 34
  const n = items.length
  if (n < 3) return null
  const angle = i => (Math.PI * 2 * i) / n - Math.PI / 2
  const point = (i, val) => {
    const rr = (val / 3) * rMax
    return `${cx + rr * Math.cos(angle(i))},${cy + rr * Math.sin(angle(i))}`
  }
  const poly = key => items.map((it, i) => point(i, Math.max(0.15, it[key] ?? 0))).join(' ')
  return (
    <svg width={size} height={size} role="img" aria-label="Competency levels radar chart">
      {[1, 2, 3].map(ring => (
        <polygon key={ring}
          points={items.map((_, i) => point(i, ring)).join(' ')}
          fill="none" stroke="var(--ink-100)" strokeWidth="1"
        />
      ))}
      {items.map((_, i) => {
        const [x, y] = point(i, 3).split(',')
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--ink-100)" strokeWidth="1" />
      })}
      <polygon points={poly('expected')} fill="none" stroke="var(--amber-500)" strokeWidth="2" strokeDasharray="5 4" />
      <polygon points={poly('level')} fill="rgba(31,127,123,0.18)" stroke="var(--teal-600)" strokeWidth="2.4" />
      {items.map((it, i) => {
        const rr = rMax + 18
        const x = cx + rr * Math.cos(angle(i))
        const y = cy + rr * Math.sin(angle(i))
        return (
          <text key={i} x={x} y={y} textAnchor={Math.abs(x - cx) < 12 ? 'middle' : x > cx ? 'start' : 'end'}
            dominantBaseline="middle" fontSize="10.5" fill="var(--ink-700)">
            {it.label.length > 16 ? it.label.slice(0, 15) + '…' : it.label}
          </text>
        )
      })}
    </svg>
  )
}
