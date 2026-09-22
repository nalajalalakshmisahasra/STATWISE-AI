import React from 'react'

export function Logo ({ size = 34, withWordmark = true, light = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <img src="/logo.jpg" alt="STATWISE logo" width={size} height={size} style={{ borderRadius: '50%', objectFit: 'cover' }} />
      {withWordmark && (
        <span style={{
          fontWeight: 800,
          letterSpacing: '0.04em',
          fontSize: size * 0.52,
          color: light ? 'var(--paper)' : 'var(--teal-900)',
          fontFamily: 'var(--font-body)'
        }}>STATWISE</span>
      )}
    </span>
  )
}

const VARIANTS = {
  primary: { background: 'var(--teal-800)', color: '#fff', border: '1px solid var(--teal-900)' },
  secondary: { background: 'var(--white)', color: 'var(--teal-900)', border: '1px solid var(--teal-700)' },
  ghost: { background: 'transparent', color: 'var(--teal-800)', border: '1px solid transparent' },
  amber: { background: 'var(--amber-500)', color: 'var(--ink-900)', border: '1px solid var(--amber-600)' },
  danger: { background: 'var(--danger)', color: '#fff', border: '1px solid #8d352e' }
}

export function Button ({ variant = 'primary', size = 'md', loading, disabled, style, children, ...rest }) {
  const base = {
    ...VARIANTS[variant],
    borderRadius: 'var(--radius-md)',
    padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '13px 26px' : '9px 18px',
    fontSize: size === 'sm' ? 13.5 : size === 'lg' ? 16.5 : 14.5,
    fontWeight: 600,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.55 : 1,
    fontFamily: 'inherit',
    transition: 'transform .06s ease, box-shadow .12s ease',
    boxShadow: 'var(--shadow-sm)'
  }
  return (
    <button
      disabled={disabled || loading}
      style={{ ...base, ...style }}
      {...rest}
    >
      {loading ? '…' : children}
    </button>
  )
}

export function Card ({ children, style, as: Tag = 'div', ...rest }) {
  return (
    <Tag
      style={{
        background: 'var(--white)',
        border: '1px solid var(--ink-100)',
        borderRadius: 'var(--radius-lg)',
        padding: 22,
        boxShadow: 'var(--shadow-sm)',
        ...style
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

const BADGE_KINDS = {
  neutral: { bg: 'var(--ink-100)', color: 'var(--ink-700)' },
  teal: { bg: 'var(--teal-100)', color: 'var(--teal-800)' },
  amber: { bg: 'var(--amber-100)', color: 'var(--warn)' },
  green: { bg: 'var(--success-bg)', color: 'var(--success)' },
  red: { bg: 'var(--danger-bg)', color: 'var(--danger)' }
}

export function Badge ({ kind = 'neutral', children, style }) {
  const k = BADGE_KINDS[kind] || BADGE_KINDS.neutral
  return (
    <span style={{
      display: 'inline-block',
      background: k.bg,
      color: k.color,
      borderRadius: 999,
      padding: '2px 10px',
      fontSize: 12,
      fontWeight: 600,
      ...style
    }}>
      {children}
    </span>
  )
}

export function LevelBadge ({ level }) {
  if (!level) return <Badge>Not assessed</Badge>
  const kind = level === 'Advanced' ? 'green' : level === 'Proficient' ? 'teal' : level === 'Developing' ? 'amber' : 'red'
  return <Badge kind={kind}>{level}</Badge>
}

export function Spinner ({ label = 'Loading…' }) {
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '28px 0', color: 'var(--ink-500)' }}>
      <span aria-hidden="true" style={{
        width: 22, height: 22, borderRadius: '50%',
        border: '3px solid var(--teal-100)', borderTopColor: 'var(--teal-700)',
        animation: 'spin 0.9s linear infinite', display: 'inline-block'
      }} />
      {label}
      <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
    </div>
  )
}

export function ErrorState ({ message, onRetry }) {
  return (
    <div role="alert" style={{
      background: 'var(--danger-bg)', color: 'var(--danger)',
      border: '1px solid #eccfcb', borderRadius: 'var(--radius-md)',
      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between'
    }}>
      <span>{message || 'Something went wrong.'}</span>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  )
}

export function EmptyState ({ title, hint, children }) {
  return (
    <div style={{
      textAlign: 'center', padding: '40px 20px',
      border: '1.5px dashed var(--ink-200)', borderRadius: 'var(--radius-lg)',
      color: 'var(--ink-500)', background: 'var(--ink-50)'
    }}>
      <div style={{ fontWeight: 700, color: 'var(--ink-700)', marginBottom: 4 }}>{title}</div>
      {hint && <div style={{ fontSize: 14 }}>{hint}</div>}
      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  )
}

export function SuccessNote ({ children }) {
  return (
    <div role="status" style={{
      background: 'var(--success-bg)', color: 'var(--success)',
      border: '1px solid #c4e2d0', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontWeight: 600
    }}>
      {children}
    </div>
  )
}

export function Field ({ label, error, hint, children, required }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontWeight: 600, fontSize: 13.5, marginBottom: 5, color: 'var(--ink-700)' }}>
        {label}{required && <span aria-hidden="true" style={{ color: 'var(--danger)' }}> *</span>}
      </span>
      {children}
      {hint && !error && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-400)', marginTop: 4 }}>{hint}</span>}
      {error && <span role="alert" style={{ display: 'block', fontSize: 12.5, color: 'var(--danger)', marginTop: 4 }}>{error}</span>}
    </label>
  )
}

export const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--ink-200)',
  fontSize: 14.5,
  fontFamily: 'inherit',
  background: 'var(--white)',
  color: 'var(--ink-900)'
}

export function ProgressBar ({ value, label }) {
  const pct = Math.max(0, Math.min(100, value || 0))
  return (
    <div style={{ width: '100%' }}>
      <div aria-hidden="true" style={{
        height: 8, background: 'var(--teal-100)', borderRadius: 999, overflow: 'hidden'
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: 'linear-gradient(90deg, var(--teal-600), var(--teal-400))',
          borderRadius: 999, transition: 'width .4s ease'
        }} />
      </div>
      {label && <span style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 4, display: 'inline-block' }}>{label}</span>}
      <span className="sr-only" style={srOnly}>{`${pct}%`}</span>
    </div>
  )
}

const srOnly = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0
}

export function SrText ({ children }) {
  return <span style={srOnly}>{children}</span>
}
