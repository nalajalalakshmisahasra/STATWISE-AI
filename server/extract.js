/**
 * Document upload validation and text extraction (PRD §6.4).
 * Supports plain text and .md/.csv directly. PDF/DOCX are validated by size/extension
 * and rejected with a clear message pointing to the sample-document path — no fake extraction.
 */
const fs = require('node:fs')

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_EXT = ['.txt', '.md', '.csv', '.pdf', '.docx']

function validateUpload (file) {
  if (!file) return { ok: false, error: 'No file provided.' }
  const ext = (file.originalname ? file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase() : '')
  if (!ALLOWED_EXT.includes(ext)) {
    return { ok: false, error: `Unsupported file type "${ext || 'unknown'}". Allowed: ${ALLOWED_EXT.join(', ')}.` }
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: 'File exceeds the 5 MB limit.' }
  }
  if (file.size === 0) {
    return { ok: false, error: 'File is empty.' }
  }
  return { ok: true, ext }
}

/**
 * Extract readable text. Returns { text, usedFallback, note }.
 * PDF/DOCX are binary formats; without a parser dependency we honestly report that
 * text extraction is unavailable for them and offer the sample document.
 */
function extractText (file) {
  const v = validateUpload(file)
  if (!v.ok) return { ok: false, error: v.error }
  if (v.ext === '.pdf' || v.ext === '.docx') {
    return {
      ok: false,
      error: `Text extraction for ${v.ext.slice(1).toUpperCase()} is not available in this demo build. Upload a .txt, .md or .csv file, or use the built-in sample document.`,
      usedFallback: false
    }
  }
  const raw = file.buffer ? file.buffer.toString('utf8') : String(file.buffer || '')
  // strip likely-binary noise
  const printable = raw.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, ' ')
  const text = printable.replace(/\s+/g, ' ').trim()
  if (text.length < 40) {
    return { ok: false, error: 'Could not extract readable text (document appears empty or binary).', usedFallback: false }
  }
  return { ok: true, text: text.slice(0, 200000), usedFallback: false }
}

const SAMPLE_DOC = {
  name: 'statwise-sample-sampling-notes.txt',
  text: `Sampling design notes (sample document for quiz generation).

Statistical surveys rely on well-designed sampling frames. A sampling frame is the list from which units are selected for measurement. A frame with gaps or duplicates causes coverage bias that no amount of weighting can fully repair.

Two-stage sampling selects primary sampling units, such as city markets, and then selects secondary units, such as outlets, within each primary unit. This design controls field costs when units cluster geographically.

Stratification divides the population into homogeneous subgroups before selection so that sampling variance is reduced compared with simple random selection. Gains are largest when stratum means differ strongly and units within strata are similar.

Weights restore the relationship between the sample and the population: each selected unit represents a known number of population units. Extreme weights inflate variance, so weight trimming may be applied with documentation.

Nonresponse must be measured and reported because it can bias estimates when respondents differ systematically from nonrespondents. Response rates should be monitored by stratum, and follow-up visits should target units where nonresponse is concentrated.

Probability proportional to size selection is efficient when larger units contribute more to the estimate. It requires careful handling of units that cross the certainty threshold, which are then selected with probability one.

Sample aging is the gradual deterioration of a fixed sample as outlets close, relocate, or change character. Monitoring the share of units older than a threshold and refreshing panels periodically keeps the survey representative.`
}

module.exports = { validateUpload, extractText, SAMPLE_DOC, MAX_SIZE, ALLOWED_EXT }
