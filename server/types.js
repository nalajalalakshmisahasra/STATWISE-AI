/**
 * Shared domain types and competency-level helpers.
 */

/** @typedef {'learner'|'trainer'|'admin'} Role */
/** @typedef {'en'|'hi'|'te'|'ta'} Language */
/** @typedef {'Beginner'|'Developing'|'Proficient'|'Advanced'} CompetencyLevel */
/** @typedef {'Statistical'|'Technical'} CompetencyDomain */

const LEVEL_ORDER = ['Beginner', 'Developing', 'Proficient', 'Advanced']

function levelIndex (level) {
  return LEVEL_ORDER.indexOf(level)
}

function levelFromScore (score01) {
  if (score01 >= 0.85) return 'Advanced'
  if (score01 >= 0.65) return 'Proficient'
  if (score01 >= 0.4) return 'Developing'
  return 'Beginner'
}

module.exports = { LEVEL_ORDER, levelIndex, levelFromScore }
