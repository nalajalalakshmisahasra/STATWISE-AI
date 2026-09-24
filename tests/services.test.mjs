import { describe, expect, it } from 'vitest'
import svc from '../server/services.js'
import ai from '../server/ai.js'
import types from '../server/types.js'

const { parseAnswer, gradeResponse } = svc
const { fallbackQuizFromText, extractJsonArray, rulesReply, isLive } = ai
const { levelFromScore } = types

describe('answer parsing & grading', () => {
  const q = { correct_answer: JSON.stringify(['Two-stage cluster sampling']) }

  it('grades exact single answers', () => {
    expect(gradeResponse(q, 'Two-stage cluster sampling')).toBe(true)
    expect(gradeResponse(q, 'Simple random sampling')).toBe(false)
  })

  it('is order-insensitive for multiple answers', () => {
    const multi = { correct_answer: JSON.stringify(['A', 'B']) }
    expect(gradeResponse(multi, ['B', 'A'])).toBe(true)
    expect(gradeResponse(multi, ['A'])).toBe(false)
    expect(gradeResponse(multi, ['A', 'C'])).toBe(false)
  })

  it('parseAnswer tolerates raw strings, JSON, and arrays', () => {
    expect(parseAnswer('X')).toEqual(['X'])
    expect(parseAnswer('["A","B"]')).toEqual(['A', 'B'])
    expect(parseAnswer(['A'])).toEqual(['A'])
    expect(parseAnswer(null)).toEqual([])
  })

  it('handles legacy plain-string correct answers', () => {
    const legacy = { correct_answer: 'Splice in a comparable replacement item' }
    expect(gradeResponse(legacy, 'Splice in a comparable replacement item')).toBe(true)
    expect(gradeResponse(legacy, 'Freeze the index')).toBe(false)
  })
})

describe('level mapping', () => {
  it('maps score ratios to levels per spec', () => {
    expect(levelFromScore(0.9)).toBe('Advanced')
    expect(levelFromScore(0.7)).toBe('Proficient')
    expect(levelFromScore(0.5)).toBe('Developing')
    expect(levelFromScore(0.1)).toBe('Beginner')
  })
})

describe('fallback quiz generation (honest, no AI)', () => {
  const text = 'Statistical surveys rely on well-designed sampling frames. A sampling frame is the list from which units are selected for measurement. Stratification divides the population into homogeneous subgroups before selection so that sampling variance is reduced compared with simple random selection.'

  it('creates grounded cloze questions with source references', () => {
    const qs = fallbackQuizFromText('Sampling', text)
    expect(qs.length).toBeGreaterThan(0)
    for (const q of qs) {
      expect(q.options.length).toBeGreaterThanOrEqual(4)
      expect(q.options).toContain(q.correct_answer[0])
      expect(q.source_ref).toMatch(/Source excerpt/)
      expect(q.explanation).toBeTruthy()
    }
  })

  it('never returns more than five questions', () => {
    expect(fallbackQuizFromText('Sampling', text).length).toBeLessThanOrEqual(5)
  })
})

describe('AI response parsing', () => {
  it('extracts a JSON array from fenced or padded model output', () => {
    const raw = 'Here you go:\n```json\n[{"prompt":"p"}]\n```'
    expect(extractJsonArray(raw)).toEqual([{ prompt: 'p' }])
    expect(extractJsonArray('no json here')).toBeNull()
  })
})

describe('assistant rules (fallback mode)', () => {
  it('answers known statistical topics', () => {
    expect(rulesReply('How does stratification reduce variance?')).toMatch(/stratif/i)
    expect(rulesReply('What are SDG tiers?')).toMatch(/tier/i)
  })

  it('admits scope instead of inventing answers', () => {
    const r = rulesReply('Who won the cricket world cup?')
    expect(r).toMatch(/Demo mode|I can explain/)
  })
})

describe('AI liveness', () => {
  it('reports not-live without credentials', () => {
    delete process.env.AI_API_KEY
    expect(isLive()).toBe(false)
  })
})
