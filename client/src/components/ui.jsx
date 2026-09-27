import React from 'react'

/* ============================================================
   STATWISE UI kit — redesigned primitives ("Ink & Signal").
   Components remain API-compatible with the previous kit so all
   pages keep working; visual behaviour is upgraded in place.
   Icons are minimal inline SVG (24px grid, one stroke weight).
   ============================================================ */

const PATHS = {
  home: <><path d="M4 11.5 12 5l8 6.5" /><path d="M6.5 10.5V19h11v-8.5" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.6" /><rect x="13" y="4" width="7" height="7" rx="1.6" /><rect x="4" y="13" width="7" height="7" rx="1.6" /><rect x="13" y="13" width="7" height="7" rx="1.6" /></>,
  user: <><circle cx="12" cy="8.2" r="3.4" /><path d="M5.5 19c1.2-3 3.6-4.6 6.5-4.6s5.3 1.6 6.5 4.6" /></>,
  target: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" /></>,
  trend: <path d="M4 17l5-5 3.5 3.5L20 8" />,
  book: <><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15.5H7.5A2.5 2.5 0 0 0 5 21z" /><path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H19" /></>,
  puzzle: <path d="M9.5 4.5a2 2 0 1 1 4 0H17v3.5a2 2 0 1 1 0 4V16h-3.5a2 2 0 1 0-4 0H6v-4a2 2 0 1 0 0-4V4.5z" />,
  spark: <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />,
  chart: <><path d="M4 20h16" /><path d="M7 16v-5M12 16V7M17 16v-8" /></>,
  shield: <path d="M12 3.5l7 2.6v5.2c0 4.3-2.9 7.6-7 9.2-4.1-1.6-7-4.9-7-9.2V6.1z" />,
  plug: <><path d="M9 3.5v5M15 3.5v5" /><path d="M6.5 8.5h11v3a5.5 5.5 0 0 1-11 0z" /><path d="M12 17v3.5" /></>,
  users: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c1-2.8 3-4.3 5.5-4.3s4.5 1.5 5.5 4.3" /><circle cx="16.5" cy="9.5" r="2.4" /><path d="M15.5 14.9c2.2.2 3.9 1.6 4.9 4.1" /></>,
  clipboard: <><rect x="5.5" y="4.5" width="13" height="16" rx="2" /><path d="M9 4.5V3h6v1.5" /><path d="M9 10.5h6M9 14h4" /></>,
  bell: <path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2.5h-15z" />,
  logout: <><path d="M14 4.5H7a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 7 19.5h7" /><path d="M11 12h9.5M17.5 8.5 21 12l-3.5 3.5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrow: <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.3 4 5.2 4 8.5s-1.4 6.2-4 8.5c-2.6-2.3-4-5.2-4-8.5s1.4-6.2 4-8.5z" /></>
}

export function Icon ({ name, size = 18, color, style }) {
  const path = PATHS[name] || PATHS.spark
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || 'currentColor'} strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, ...style }}
    >
      {path}
    </svg>
  )
}

export function Logo ({ size = 34, withWordmark = true, light = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <img src="/logo.jpg" alt="STATWISE logo" width={size} height={size} style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: light ? '0 0 0 1.5px rgba(250,247,240,.35)' : 'none' }} />
      {withWordmark && (
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          letterSpacing: '0.10em',
          fontSize: size * 0.44,
          color: light ? 'var(--paper)' : 'var(--teal-900)'
        }}>STATWISE</span>
      )}
    </span>
  )
}

/* ---------- Button ---------- */

const BTN_VARIANTS = {
  primary: { background: 'var(--teal-800)', color: '#fff', border: '1px solid var(--teal-900)', boxShadow: 'var(--shadow-1)' },
  secondary: { background: 'var(--surface)', color: 'var(--teal-800)', border: '1px solid var(--teal-200)', boxShadow: 'var(--shadow-1)' },
  ghost: { background: 'transparent', color: 'var(--teal-800)', border: '1px solid transparent', boxShadow: 'none' },
  dark: { background: 'var(--ink-950)', color: 'var(--paper)', border: '1px solid var(--ink-950)', boxShadow: 'var(--shadow-1)' },
  amber: { background: 'var(--amber-500)', color: '#2b1d05', border: '1px solid var(--amber-600)', boxShadow: 'var(--shadow-1)' },
  danger: { background: 'var(--danger)', color: '#fff', border: '1px solid #8a2f28', boxShadow: 'var(--shadow-1)' }
}

export function Button ({ variant = 'primary', size = 'md', loading, disabled, style, children, ...rest }) {
  const v = BTN_VARIANTS[variant] || BTN_VARIANTS.primary
  const base = {
    ...v,
    borderRadius: 'var(--radius-sm)',
    padding: size === 'sm' ? '7px 13px' : size === 'lg' ? '14px 28px' : '9.5px 19px',
    fontSize: size === 'sm' ? 13 : size === 'lg' ? 15.5 : 14,
    fontWeight: 600,
    lineHeight: 1.25,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.55 : 1,
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    whiteSpace: 'nowrap'
  }
  return (
    <button
      disabled={disabled || loading}
      style={{ ...base, ...style }}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          e.currentTarget.style.boxShadow = 'var(--shadow-2)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = (style && style.boxShadow) || v.boxShadow
        e.currentTarget.style.transform = 'none'
      }}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : children}
    </button>
  )
}

/* ---------- Surfaces ---------- */

export function Card ({ children, style, as: Tag = 'div', hover, ...rest }) {
  return (
    <Tag
      className="panel"
      style={{
        padding: 22,
        ...(hover
          ? {
              transition: 'box-shadow .2s ease, transform .2s ease, border-color .2s ease',
              cursor: rest.onClick ? 'pointer' : undefined
            }
          : {}),
        ...style
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** Section: consistent heading + optional action row + body */
export function Section ({ title, sub, actions, children, style }) {
  return (
    <section className="anim-in" style={{ marginBottom: 26, ...style }}>
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            {title && <h2 style={{ fontSize: 17.5, fontWeight: 700 }}>{title}</h2>}
            {sub && <p style={{ margin: 0, color: 'var(--ink-500)', fontSize: 13.5 }}>{sub}</p>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

/** Segmented control — replaces filter-button rows */
export function Segmented ({ options, value, onChange, size = 'md', ariaLabel }) {
  return (
    <div role="tablist" aria-label={ariaLabel} style={{
      display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--ink-100)',
      borderRadius: 'var(--radius-sm)', padding: 3, gap: 2, flexWrap: 'wrap'
    }}>
      {options.map(o => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            style={{
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 650 : 500,
              fontSize: size === 'sm' ? 12.5 : 13.5, padding: size === 'sm' ? '5px 11px' : '7px 14px',
              borderRadius: 7,
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--teal-800)' : 'var(--ink-500)',
              boxShadow: active ? 'var(--shadow-1)' : 'none'
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Badges ---------- */

const BADGE_KINDS = {
  neutral: { bg: 'var(--surface-2)', color: 'var(--ink-700)', border: 'transparent' },
  teal: { bg: 'var(--teal-50)', color: 'var(--teal-800)', border: 'var(--teal-100)' },
  amber: { bg: 'var(--amber-50)', color: 'var(--amber-700)', border: 'var(--amber-100)' },
  green: { bg: 'var(--success-bg)', color: 'var(--success)', border: 'transparent' },
  red: { bg: 'var(--danger-bg)', color: 'var(--danger)', border: 'transparent' },
  outline: { bg: 'transparent', color: 'var(--ink-500)', border: 'var(--ink-200)' }
}

export function Badge ({ kind = 'neutral', children, style, dot }) {
  const k = BADGE_KINDS[kind] || BADGE_KINDS.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: k.bg, color: k.color,
      border: `1px solid ${k.border}`,
      borderRadius: 999,
      padding: '3px 10px',
      fontSize: 11.8,
      fontWeight: 600,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
      ...style
    }}>
      {dot && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor', opacity: 0.8 }} />}
      {children}
    </span>
  )
}

export function LevelBadge ({ level }) {
  if (!level) return <Badge kind="outline">Not assessed</Badge>
  const kind = level === 'Advanced' ? 'green' : level === 'Proficient' ? 'teal' : level === 'Developing' ? 'amber' : 'red'
  return <Badge kind={kind}>{level}</Badge>
}

/* ---------- Meters ---------- */

export function ProgressBar ({ value, label, color, height = 7, showValue }) {
  const pct = Math.max(0, Math.min(100, value || 0))
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.3, color: 'var(--ink-500)', marginBottom: 5 }}>
          <span>{label}</span>
          {showValue && <strong className="metric" style={{ color: 'var(--ink-700)' }}>{pct}%</strong>}
        </div>
      )}
      <div aria-hidden="true" style={{ height, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color || 'var(--teal-600)',
          borderRadius: 99,
          transition: 'width .5s cubic-bezier(.22,.9,.3,1)'
        }} />
      </div>
      <span className="sr-only">{`${pct}%`}</span>
    </div>
  )
}

/** Level positions 0–3 rendered as a compact 4-step meter */
export function LevelMeter ({ level0to3, expected0to3, max = 3 }) {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: max + 1 }).map((_, i) => (
        <span key={i} style={{
          width: 14, height: 6, borderRadius: 4,
          background: i <= level0to3 ? 'var(--teal-600)' : 'var(--surface-3)',
          boxShadow: i === expected0to3 ? 'inset 0 0 0 1.5px var(--amber-500)' : 'none'
        }} />
      ))}
    </span>
  )
}

/* ---------- Feedback ---------- */

export function Spinner ({ label = 'Loading…', size = 20 }) {
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '26px 0', color: 'var(--ink-500)', fontSize: 13.5 }}>
      <span aria-hidden="true" style={{
        width: size, height: size, borderRadius: '50%',
        border: '2.5px solid var(--teal-100)', borderTopColor: 'var(--teal-600)',
        animation: 'sw-spin 0.85s linear infinite', display: 'inline-block', flexShrink: 0
      }} />
      {label}
    </div>
  )
}

/** Skeleton placeholder block matching content shape */
export function Skeleton ({ w = '100%', h = 14, r = 8, style }) {
  return (
    <span aria-hidden="true" style={{
      display: 'block', width: w, height: h, borderRadius: r,
      background: 'linear-gradient(100deg, var(--surface-2) 40%, var(--surface-3) 50%, var(--surface-2) 60%)',
      backgroundSize: '200% 100%',
      animation: 'sw-shimmer 1.4s linear infinite',
      ...style
    }} />
  )
}

// keyframes injected once
if (typeof document !== 'undefined' && !document.getElementById('sw-shimmer-kf')) {
  const s = document.createElement('style')
  s.id = 'sw-shimmer-kf'
  s.textContent = '@keyframes sw-shimmer { to { background-position: -200% 0 } }'
  document.head.appendChild(s)
}

export function SkeletonPage () {
  return (
    <div aria-hidden="true" style={{ display: 'grid', gap: 16 }}>
      <Skeleton w={260} h={26} />
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[0, 1, 2, 3].map(i => <Skeleton key={i} w={200} h={92} r={14} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <Skeleton w="100%" h={240} r={16} />
        <Skeleton w="100%" h={240} r={16} />
      </div>
    </div>
  )
}

export function ErrorState ({ message, onRetry }) {
  return (
    <div role="alert" style={{
      background: 'var(--danger-bg)', color: 'var(--danger)',
      border: '1px solid #edcfca', borderRadius: 'var(--radius-md)',
      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between', flexWrap: 'wrap'
    }}>
      <span style={{ fontWeight: 550 }}>{message || 'Something went wrong.'}</span>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  )
}

export function EmptyState ({ title, hint, icon = 'spark', children }) {
  return (
    <div style={{
      textAlign: 'center', padding: '38px 22px',
      border: '1.5px dashed var(--ink-200)', borderRadius: 'var(--radius-lg)',
      background: 'var(--surface-2)'
    }}>
      <Icon name={icon} size={26} color="var(--ink-300)" style={{ marginBottom: 8 }} />
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink-700)', marginBottom: 4 }}>{title}</div>
      {hint && <div style={{ fontSize: 13.3, color: 'var(--ink-500)', maxWidth: 380, margin: '0 auto' }}>{hint}</div>}
      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  )
}

export function SuccessNote ({ children }) {
  return (
    <div role="status" style={{
      background: 'var(--success-bg)', color: 'var(--success)',
      border: '1px solid #c5e3d1', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontWeight: 600, fontSize: 13.5,
      display: 'flex', alignItems: 'center', gap: 9
    }}>
      <Icon name="check" size={15} />
      {children}
    </div>
  )
}

/** Callout banner — for focus / attention rows */
export function Callout ({ tone = 'teal', icon, children, action }) {
  const tones = {
    teal: { bg: 'var(--teal-50)', border: 'var(--teal-200)', color: 'var(--teal-900)' },
    amber: { bg: 'var(--amber-50)', border: 'var(--amber-300)', color: 'var(--amber-700)' },
    ink: { bg: 'var(--ink-surface)', border: 'var(--ink-surface)', color: 'var(--paper)' }
  }
  const tn = tones[tone] || tones.teal
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      background: tn.bg, border: `1px solid ${tn.border}`, borderRadius: 'var(--radius-md)',
      padding: '14px 18px', color: tn.color
    }}>
      {icon && <Icon name={icon} size={19} color={tn.color} />}
      <span style={{ flex: 1, minWidth: 220, fontSize: 14, fontWeight: 550 }}>{children}</span>
      {action}
    </div>
  )
}

/* ---------- Forms ---------- */

export function Field ({ label, error, hint, children, required }) {
  return (
    <label style={{ display: 'block', marginBottom: 15 }}>
      <span style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5, color: 'var(--ink-700)', letterSpacing: '0.01em' }}>
        {label}{required && <span aria-hidden="true" style={{ color: 'var(--danger)' }}> *</span>}
      </span>
      {children}
      {hint && !error && <span style={{ display: 'block', fontSize: 12.3, color: 'var(--ink-400)', marginTop: 4 }}>{hint}</span>}
      {error && <span role="alert" style={{ display: 'block', fontSize: 12.3, color: 'var(--danger)', marginTop: 4, fontWeight: 550 }}>{error}</span>}
    </label>
  )
}

export const inputStyle = {
  width: '100%',
  padding: '9.5px 13px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--ink-200)',
  fontSize: 14,
  fontFamily: 'inherit',
  background: 'var(--surface)',
  color: 'var(--ink-950)',
  transition: 'border-color .15s ease, box-shadow .15s ease'
}

/** Selectable option card (single or multi). Used by onboarding & filters. */
export function OptionCard ({ selected, onClick, title, sub, multi, disabled, style }) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      style={{
        textAlign: 'left', cursor: disabled ? 'wait' : 'pointer', fontFamily: 'inherit',
        borderRadius: 'var(--radius-md)', padding: '13px 15px',
        border: selected ? '1.5px solid var(--teal-600)' : '1px solid var(--ink-200)',
        background: selected ? 'var(--teal-50)' : 'var(--surface)',
        boxShadow: selected ? 'var(--shadow-glow-teal)' : 'none',
        color: 'var(--ink-900)', width: '100%',
        transition: 'border-color .15s ease, background-color .15s ease, box-shadow .2s ease',
        ...style
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontWeight: selected ? 650 : 550, fontSize: 14 }}>{title}</span>
        <span aria-hidden="true" style={{
          width: 18, height: 18, borderRadius: multi ? 5 : 99, flexShrink: 0,
          border: selected ? 'none' : '1.5px solid var(--ink-300)',
          background: selected ? 'var(--teal-600)' : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {selected && <Icon name="check" size={11} color="#fff" />}
        </span>
      </span>
      {sub && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-500)', marginTop: 3 }}>{sub}</span>}
    </button>
  )
}

/* ---------- Tables ---------- */

export function Table ({ columns, children, style }) {
  return (
    <div className="thin-scroll panel" style={{ overflowX: 'auto', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 560 }}>
        {columns && (
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} style={{
                  textAlign: 'left', fontSize: 11.3, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--ink-400)',
                  padding: '11px 16px', borderBottom: '1px solid var(--ink-100)',
                  background: 'var(--surface-2)', whiteSpace: 'nowrap'
                }}>{c}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Td ({ children, style, numeric }) {
  return (
    <td style={{
      padding: '11px 16px', borderBottom: '1px solid var(--ink-50)',
      fontVariantNumeric: numeric ? 'tabular-nums' : undefined,
      verticalAlign: 'middle', ...style
    }}>
      {children}
    </td>
  )
}

export function Tr ({ children, style, ...rest }) {
  return (
    <tr style={{ transition: 'background-color .12s ease', ...style }} {...rest}>
      {children}
    </tr>
  )
}
