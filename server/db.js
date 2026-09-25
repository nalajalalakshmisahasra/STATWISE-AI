const { DatabaseSync } = require('node:sqlite')
const path = require('node:path')
const fs = require('node:fs')

/**
 * Database bootstrap using Node's built-in SQLite (node:sqlite).
 * Zero native dependencies; file-based persistence at data/statwise.db.
 * Schema follows the PRD §8.2 logical entities.
 */
const DATA_DIR = path.join(__dirname, '..', 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new DatabaseSync(process.env.DATABASE_PATH || path.join(DATA_DIR, 'statwise.db'))
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('learner','trainer','admin')),
  language TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS learner_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  department TEXT,
  designation TEXT,
  job_role TEXT,
  assignment TEXT,
  education TEXT,
  experience_years INTEGER,
  previous_training TEXT,
  interests TEXT,
  self_reported_skills TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trainer_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id INTEGER NOT NULL REFERENCES users(id),
  learner_id INTEGER NOT NULL REFERENCES users(id),
  cohort TEXT,
  UNIQUE (trainer_id, learner_id)
);

CREATE TABLE IF NOT EXISTS competencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('Statistical','Technical')),
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_competency_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_role TEXT NOT NULL,
  competency_id INTEGER NOT NULL REFERENCES competencies(id),
  expected_level TEXT NOT NULL CHECK (expected_level IN ('Beginner','Developing','Proficient','Advanced')),
  relevance TEXT,
  UNIQUE (job_role, competency_id)
);

CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER REFERENCES assessments(id),
  competency_id INTEGER NOT NULL REFERENCES competencies(id),
  question_type TEXT NOT NULL DEFAULT 'single' CHECK (question_type IN ('single','multiple')),
  prompt TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  source_ref TEXT,
  origin TEXT NOT NULL DEFAULT 'seeded' CHECK (origin IN ('seeded','ai_generated','trainer_edited')),
  grounding_status TEXT NOT NULL DEFAULT 'grounded' CHECK (grounding_status IN ('grounded','partial','insufficient')),
  approved INTEGER NOT NULL DEFAULT 0,
  difficulty INTEGER NOT NULL DEFAULT 2,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assessment_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  response TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  answered_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assessment_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL UNIQUE REFERENCES assessments(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  score_pct REAL NOT NULL,
  competency_scores TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_gaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  competency_id INTEGER NOT NULL REFERENCES competencies(id),
  assessed_level TEXT,
  expected_level TEXT NOT NULL,
  gap INTEGER NOT NULL DEFAULT 0,
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, competency_id)
);

CREATE TABLE IF NOT EXISTS learning_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  competency_id INTEGER NOT NULL REFERENCES competencies(id),
  provider TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'demo' CHECK (source_type IN ('verified','demo')),
  resource_type TEXT NOT NULL DEFAULT 'course' CHECK (resource_type IN ('course','case_study','module','video','reading','practice')),
  duration_hours REAL,
  outcome TEXT,
  url TEXT,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','pending_review','retired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  resource_id INTEGER NOT NULL REFERENCES learning_resources(id),
  competency_id INTEGER NOT NULL REFERENCES competencies(id),
  rationale TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','dismissed')),
  basis TEXT NOT NULL DEFAULT 'gap' CHECK (basis IN ('gap','interest','adaptive','assignment','history')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS learning_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  competency_id INTEGER NOT NULL REFERENCES competencies(id),
  activity_type TEXT NOT NULL DEFAULT 'case_study' CHECK (activity_type IN ('case_study','module','exercise')),
  content TEXT NOT NULL,
  dataset_note TEXT,
  assigned_by INTEGER REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned','completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  competency_id INTEGER NOT NULL REFERENCES competencies(id),
  record_type TEXT NOT NULL CHECK (record_type IN ('assessment','activity','quiz','resource')),
  reference_id INTEGER,
  level_before TEXT,
  level_after TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  topic TEXT,
  competency_id INTEGER REFERENCES competencies(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  source_doc_name TEXT,
  source_excerpt TEXT,
  generation_mode TEXT NOT NULL DEFAULT 'fallback' CHECK (generation_mode IN ('ai','fallback')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','published','retired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  score_pct REAL NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  answers TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trainer_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
  trainer_id INTEGER NOT NULL REFERENCES users(id),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  action TEXT NOT NULL CHECK (action IN ('approved','edited','rejected')),
  edit_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS integration_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'demo_data' CHECK (status IN ('demo_data','not_configured','requires_authorization','live')),
  detail TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  mode TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_responses_assessment ON assessment_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_gaps_user ON skill_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_recs_user ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON quiz_attempts(quiz_id);
`)

// ---------- Additive migrations (safe for existing databases) ----------
function columnNames (table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)
}
function addColumn (table, ddl) {
  const name = ddl.match(/^"?([a-zA-Z_]+)"?\s/)[1]
  if (!columnNames(table).includes(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
  }
}

// Registration passwords + email verification + login throttling.
addColumn('users', 'password_hash TEXT')
addColumn('users', 'password_salt TEXT')
addColumn('users', 'email_verified INTEGER NOT NULL DEFAULT 0')
// Role requested at registration. Accounts activate as 'learner'; a requested
// trainer role is promoted on verification. 'admin' is NEVER self-serviceable —
// administrators are provisioned by an existing admin (or the seed).
addColumn('users', 'role_pending TEXT')
addColumn('users', 'verification_code_hash TEXT')
addColumn('users', 'verification_salt TEXT')
addColumn('users', 'verification_expires TEXT')
addColumn('users', 'verification_attempts INTEGER NOT NULL DEFAULT 0')
addColumn('users', 'verification_last_sent TEXT')
addColumn('users', 'verification_resends INTEGER NOT NULL DEFAULT 0')
addColumn('users', 'failed_logins INTEGER NOT NULL DEFAULT 0')
addColumn('users', 'locked_until TEXT')

// Learner onboarding profile (spec §6). Kept on learner_profiles so the
// personalization engine reads a single row.
addColumn('learner_profiles', 'current_status TEXT')
addColumn('learner_profiles', 'field_of_study TEXT')
addColumn('learner_profiles', 'learning_goals TEXT') // JSON array
addColumn('learner_profiles', 'skill_levels TEXT') // JSON: self-reported, never evidence
addColumn('learner_profiles', 'learning_preferences TEXT') // JSON array
addColumn('learner_profiles', 'available_time TEXT')
addColumn('learner_profiles', 'onboarding_completed INTEGER NOT NULL DEFAULT 0')

// Legacy seed rows stored correct_answer as a bare string while everything
// else stores JSON. Normalize once (idempotent); grading and review screens
// parse JSON and must see consistent storage.
try {
  const legacy = db.prepare("SELECT id, correct_answer, origin FROM questions WHERE correct_answer NOT LIKE '[%'").all()
  for (const row of legacy) {
    if (row.origin === 'seeded') {
      // Bare-string seed values: wrap into a proper JSON array.
      db.prepare('UPDATE questions SET correct_answer = ? WHERE id = ?').run(JSON.stringify([String(row.correct_answer)]), row.id)
    } else {
      // JSON-encoded string values: unwrap to the bare string (not an array).
      db.prepare('UPDATE questions SET correct_answer = ? WHERE id = ?').run(String(row.correct_answer), row.id)
    }
  }
} catch (e) {
  console.warn('[migrate] correct_answer normalization skipped:', e.message)
}

module.exports = db
