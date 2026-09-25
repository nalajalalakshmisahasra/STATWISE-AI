/**
 * Localization regression test: every locale must define every key present in
 * the English dictionary, with no empty or placeholder-looking values. This is
 * the "no obvious missing translation keys or raw placeholder strings" check
 * required before sign-off, made deterministic in CI.
 */
import { describe, expect, it } from 'vitest'
import { STRINGS, LANGUAGES } from '../client/src/locales/strings.js'

function flat (obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    (v && typeof v === 'object' && !Array.isArray(v)) ? flat(v, prefix + k + '.') : [[prefix + k, v]]
  )
}

describe('localization dictionaries', () => {
  it('provides all four locales', () => {
    expect(Object.keys(STRINGS).sort()).toEqual(['en', 'hi', 'ta', 'te'])
    expect(LANGUAGES.length).toBe(4)
    for (const l of LANGUAGES) {
      expect(l.native).toBeTruthy()
      expect(l.label).toBeTruthy()
    }
  })

  it('has full key parity with no empty or placeholder values in every locale', () => {
    const enEntries = flat(STRINGS.en)
    expect(enEntries.length).toBeGreaterThan(150)
    const enKeys = new Set(enEntries.map(([k]) => k))

    for (const [loc, tree] of Object.entries(STRINGS)) {
      if (loc === 'en') continue
      const entries = flat(tree)
      const keys = new Set(entries.map(([k]) => k))
      const missing = [...enKeys].filter(k => !keys.has(k))
      const extra = entries.filter(([k]) => !enKeys.has(k)).map(([k]) => k)
      const empty = entries.filter(([, v]) => v === '' || v == null).map(([k]) => k)
      const raw = entries.filter(([k, v]) =>
        typeof v === 'string' && (v === k || v.includes('undefined') || v.includes('[object'))
      ).map(([k]) => k)
      expect({ locale: loc, missing, extra, empty, raw }).toEqual({
        locale: loc, missing: [], extra: [], empty: [], raw: []
      })
    }
  })

  it('renders Hindi, Telugu and Tamil differently from English for key UI strings', () => {
    for (const loc of ['hi', 'te', 'ta']) {
      expect(STRINGS[loc]['nav.dashboard']).toBeTruthy()
      expect(STRINGS[loc]['nav.dashboard']).not.toBe(STRINGS.en['nav.dashboard'])
      expect(STRINGS[loc]['auth.signIn']).toBeTruthy()
      expect(STRINGS[loc]['auth.signIn']).not.toBe(STRINGS.en['auth.signIn'])
    }
  })
})
