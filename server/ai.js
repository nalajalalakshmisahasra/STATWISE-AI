/**
 * AI provider abstraction (PRD §6.4/§6.5, §9).
 *
 * If AI_PROVIDER + AI_API_KEY are configured server-side, generation requests go
 * to the live provider. Otherwise a clearly-labelled rules-based fallback runs.
 * `mode` is always reported honestly: 'ai' (live model) or 'fallback' (rules).
 * Never claim live AI when the fallback produced the output.
 */
const https = require('node:https')

function aiConfig () {
  return {
    provider: process.env.AI_PROVIDER || null,
    apiKey: process.env.AI_API_KEY || null,
    model: process.env.AI_MODEL || null
  }
}

function isLive () {
  const { provider, apiKey } = aiConfig()
  return Boolean(provider && apiKey)
}

function postJson (url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const data = JSON.stringify(body)
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
    }, res => {
      let buf = ''
      res.on('data', d => { buf += d })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(buf) }) } catch (e) { reject(new Error('Bad AI provider response')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(20000, () => req.destroy(new Error('AI provider timeout')))
    req.write(data)
    req.end()
  })
}

/**
 * Call the configured provider (OpenAI-compatible chat completions endpoint).
 * Returns { text, model } or throws so the caller can fall back honestly.
 */
async function callProvider (systemPrompt, userPrompt) {
  const { provider, apiKey, model } = aiConfig()
  const url = provider === 'anthropic'
    ? 'https://api.anthropic.com/v1/messages'
    : 'https://api.openai.com/v1/chat/completions'
  const headers = provider === 'anthropic'
    ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    : { Authorization: `Bearer ${apiKey}` }
  const body = provider === 'anthropic'
    ? { model: model || 'claude-3-5-haiku-latest', max_tokens: 2000, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }
    : { model: model || 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }
  const { status, json } = await postJson(url, headers, body)
  if (status !== 200) throw new Error(`AI provider error ${status}`)
  const text = provider === 'anthropic'
    ? json.content && json.content[0] && json.content[0].text
    : json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content
  if (!text) throw new Error('AI provider returned no text')
  return { text, model: model || 'default' }
}

/** Extract JSON array from a model response that may wrap it in prose or code fences. */
function extractJsonArray (text) {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return null
  try { return JSON.parse(text.slice(start, end + 1)) } catch { return null }
}

function buildQuizSystemPrompt () {
  return 'You are an assessment designer for official statistics training. ' +
    'Generate multiple-choice questions STRICTLY grounded in the provided source text. ' +
    'Return ONLY a JSON array, each item: {"prompt": string, "options": [string, string, string, string], ' +
    '"correct_answer": [string], "explanation": string, "source_ref": string}. ' +
    'The correct answer must be a single-element array containing the exact option text. ' +
    'If the source text is too thin to support a question, include a field "grounding": "insufficient" on that item.'
}

function buildQuizUserPrompt (topic, text) {
  const clipped = text.slice(0, 6000)
  return `Topic: ${topic}\n\nSource text:\n${clipped}\n\nGenerate 5 grounded MCQs. Include source_ref citing a phrase or section of the source for each.`
}

/**
 * Rules-based fallback quiz generation from real source text (no AI claims).
 * Creates cloze-style questions from the most content-bearing sentences.
 */
function fallbackQuizFromText (topic, text) {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 60 && s.length < 300 && /[a-z]/.test(s))
  const questions = []
  const keywords = ['sample', 'stratif', 'variance', 'bias', 'survey', 'index', 'quality', 'data', 'estimat', 'weight', 'frame', 'error']
  const seen = new Set()
  for (const s of sentences) {
    if (questions.length >= 5) break
    const lower = s.toLowerCase()
    const kw = keywords.find(k => lower.includes(k))
    if (!kw) continue
    const words = s.split(' ')
    const target = words.find(w => w.length > 5 && /[a-zA-Z]/.test(w) && !seen.has(w.toLowerCase()))
    if (!target) continue
    seen.add(target.toLowerCase())
    const stem = s.replace(target, '______')
    if (stem === s) continue
    const distractors = words.filter(w => w !== target && w.length > 4 && /[a-zA-Z]/.test(w)).slice(0, 12)
    const unique = [...new Set(distractors)].slice(0, 3)
    while (unique.length < 3) unique.push(['methodology', 'framework', 'measurement'][unique.length % 3])
    const options = [target, ...unique]
    // deterministic shuffle for stable tests
    options.sort((a, b) => a.localeCompare(b))
    questions.push({
      prompt: `Fill in the blank (source-grounded, topic: ${topic}): ${stem}`,
      options,
      correct_answer: [target],
      explanation: 'The source text states this directly; the blank completes the sentence as written in the document.',
      source_ref: `Source excerpt: "…${s.slice(0, 120)}…"`
    })
  }
  return questions
}

const FALLBACK_SAMPLE_TEXT = `Statistical surveys rely on well-designed sampling frames. A sampling frame is the list from which units are selected for measurement. Two-stage sampling selects primary sampling units, such as city markets, and then selects secondary units, such as outlets, within each primary unit. Stratification divides the population into homogeneous subgroups before selection so that sampling variance is reduced compared with simple random selection. Weights restore the relationship between the sample and the population: each selected unit represents a known number of population units. Nonresponse must be measured and reported because it can bias estimates when respondents differ systematically from nonrespondents. Data quality frameworks such as the DQAF define dimensions including accuracy, timeliness, accessibility, and coherence, and they require documented editing and imputation procedures. Price index compilation requires handling item replacement through splicing so that long series remain comparable over time. Metadata standards such as SDMX and process models such as GSBPM improve coherence and exchange of statistical data between agencies.`

/**
 * Generate quiz questions.
 * Returns { mode: 'ai'|'fallback', questions: [...], note, model? }.
 * mode honestly reflects how questions were produced.
 */
async function generateQuizQuestions (topic, text, opts = {}) {
  const count = opts.count || 5
  if (isLive()) {
    try {
      const { text: raw, model } = await callProvider(buildQuizSystemPrompt(), buildQuizUserPrompt(topic, text))
      const parsed = extractJsonArray(raw)
      if (parsed && Array.isArray(parsed) && parsed.length) {
        const questions = parsed.slice(0, count).map(q => ({
          prompt: String(q.prompt || '').slice(0, 800),
          options: Array.isArray(q.options) ? q.options.map(String).slice(0, 6) : [],
          correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer.map(String) : [],
          explanation: String(q.explanation || '').slice(0, 1000),
          source_ref: String(q.source_ref || '').slice(0, 400),
          grounding_status: q.grounding === 'insufficient' ? 'insufficient' : 'grounded'
        })).filter(q => q.prompt && q.options.length >= 3 && q.correct_answer.length)
        if (questions.length) return { mode: 'ai', questions, model, note: 'Questions generated by a live AI model from the provided source text.' }
      }
      // model responded but unusable
      return {
        mode: 'fallback',
        questions: fallbackQuizFromText(topic, text).slice(0, count),
        note: 'The live AI response could not be parsed, so a rules-based fallback generated these questions from the source text. This is NOT live AI output.'
      }
    } catch (e) {
      return {
        mode: 'fallback',
        questions: fallbackQuizFromText(topic, text).slice(0, count),
        note: `Live AI call failed (${e.message}); rules-based fallback generated these questions from the source text. This is NOT live AI output.`
      }
    }
  }
  const source = text && text.trim().length > 80 ? text : FALLBACK_SAMPLE_TEXT
  const usedSample = !(text && text.trim().length > 80)
  return {
    mode: 'fallback',
    questions: fallbackQuizFromText(topic, source).slice(0, count),
    note: usedSample
      ? 'No AI provider configured. Rules-based fallback used the built-in sample document text. These are NOT AI-generated questions.'
      : 'No AI provider configured. Rules-based fallback built these questions directly from your document text. These are NOT AI-generated questions.',
    model: null
  }
}

const ASSISTANT_RULES = [
  { match: /sampling|stratif|frame/i, answer: 'Sampling turns a hard census into an affordable measurement. Key ideas: the sampling frame (the list you select from), stratification (splitting into homogeneous groups to cut variance), weights (each sampled unit represents several population units), and two-stage designs (select markets, then outlets). If you tell me which concept feels unclear — frame, stratification, or weighting — I can walk through a concrete example.' },
  { match: /variance|precision|confidence/i, answer: 'Sampling variance measures how much an estimate would wobble across repeated samples. Two levers reduce it: larger samples and better stratification (units within strata look alike). In practice, design effects compare your design variance with simple random sampling; a design effect above 1.5 usually means the stratification or weighting deserves review.' },
  { match: /gdp|national accounts|sna/i, answer: 'GDP can be approached three ways, which must match: production (output minus intermediate consumption, summed as GVA), expenditure (consumption + investment + government + net exports), and income (wages + profits + taxes minus subsidies). Compilation differences usually come from source coverage — e.g., informal sector adjustments — which is why supply-use tables exist to reconcile them.' },
  { match: /cpi|price index|inflation/i, answer: 'A consumer price index measures the change in cost of a fixed basket. Practical issues: item replacement (use comparable splices to keep the series continuous), outlet rotation (can introduce chain drift if handled inconsistently), and weighting updates (annual chains reflect current consumption better but add complexity). If you are debugging an index series, first check whether a replacement or rebase happened that month.' },
  { match: /plfs|labour|employment|unemploy/i, answer: 'Labour statistics hinge on reference periods: current weekly status (7 days) captures short-term activity, principal status (365 days) captures the usual situation. Nonresponse matters here: if nonresponding households differ systematically — say, urban migrants — unemployment estimates can be biased, so report response rates by stratum and test for differences on roster characteristics.' },
  { match: /sdg|indicator/i, answer: 'SDG indicators are grouped into tiers by methodological maturity: Tier I has established methodology and wide data availability; Tier II methodology is established but data coverage is weaker; Tier III lacks established methodology. For national reporting, the practical questions are: which source feeds each indicator, what disaggregation is feasible without unreliable small cells, and how metadata are documented.' },
  { match: /quality|validation|editing|impute/i, answer: 'Data quality work separates hard validation failures (logically impossible values, e.g. output > turnover) from plausibility flags (e.g. negative value-added, which has real-world causes). Document every edit; the DQAF dimensions — accuracy, timeliness, accessibility, coherence — give you a checklist for release decisions. If edits exceed a threshold, escalate for review before publishing.' },
  { match: /python|pandas|analysis workflow/i, answer: 'For official-statistics work in Python: pandas handles the tabular core (read_csv, merge, groupby, pivot), validation belongs in explicit rule functions that log every change, and notebooks should be reserved for exploration — production checks should run as scripts so they are reproducible. Start with a small validation script that reports counts of failures per rule; that alone catches most batch problems.' },
  { match: /quiz|revision|study plan/i, answer: 'A practical study loop: take the short diagnostic quiz, review explanations for anything missed (not just the answer), do one case study applying the same concept, then retake a fresh quiz on the topic. If your score is below 60%, spend the first session on the foundational resource before practicing; above 85%, move to an advanced case study instead.' },
  { match: /metadata|sdmx|gsbpm/i, answer: 'Metadata make statistics usable and trustworthy. Structural metadata (SDMX) describe dimensions, codes, and structures so systems can exchange data; reference metadata explain concepts, sources, and methods (GSBPM maps the production phases where each is produced). When a series changes, update the reference metadata first — it is the contract with your users.' },
  { match: /viz|visuali|chart|dashboard/i, answer: 'Choose the chart from the question: trend over time → line; comparison across categories → bar; distribution → histogram or box; part-to-whole with few parts → stacked bar (not pie). For official statistics, always label units and reference period, note the source and any break in series, and prefer direct labelling over legends when space allows.' }
]

/** Learning assistant. Live provider if configured; otherwise honest rules-based fallback. */
async function assistantReply (question, context) {
  if (isLive()) {
    try {
      const ctx = context ? `\n\nLearner context (for personalization, not to be revealed verbatim): ${context}` : ''
      const { text, model } = await callProvider(
        'You are STATWISE, a learning assistant for statistical professionals. Answer clearly and practically. Ground answers in general statistical practice. If you are unsure about a specific official rule or course detail, say so honestly.',
        question + ctx
      )
      return { mode: 'ai', reply: text, model }
    } catch (e) {
      return { mode: 'fallback', reply: rulesReply(question), note: `Live AI unavailable (${e.message}); this is a rules-based demo response, not live AI.` }
    }
  }
  return { mode: 'fallback', reply: rulesReply(question), note: 'Demo mode: this is a rules-based response from built-in topic notes, not a live AI model. Set AI_PROVIDER, AI_API_KEY and AI_MODEL server-side to enable live AI.' }
}

function rulesReply (question) {
  const rule = ASSISTANT_RULES.find(r => r.match.test(question))
  if (rule) return rule.answer
  return 'I can explain statistical concepts used in this platform — sampling, variance, national accounts, price statistics, labour statistics, SDG indicators, data quality, Python workflows, metadata, and visualization. Ask about one of those topics. (Demo mode: responses come from built-in notes, not a live AI model. Configure AI_PROVIDER, AI_API_KEY and AI_MODEL to enable live AI.)'
}

module.exports = { aiConfig, isLive, generateQuizQuestions, assistantReply, fallbackQuizFromText, rulesReply, extractJsonArray }
