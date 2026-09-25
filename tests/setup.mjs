/**
 * Test harness: boots the Express app against a fresh temporary database
 * and provides an HTTP helper with cookie persistence per user.
 */
process.env.NODE_ENV = 'test'
process.env.DATABASE_PATH = ':memory:'

const app = require('../server/index.js')

let server
let baseUrl

function start () {
  if (server) return Promise.resolve(baseUrl)
  return new Promise(resolve => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`
      resolve(baseUrl)
    })
  })
}

function stop () {
  return new Promise(resolve => {
    if (!server) return resolve()
    server.close(() => resolve())
  })
}

/**
 * Minimal cookie-jar fetch: keep the Set-Cookie from login and send it back.
 */
async function call (jar, method, path, body) {
  const headers = {}
  if (jar.cookie) headers.Cookie = jar.cookie
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) jar.cookie = setCookie.split(';')[0]
  let data = null
  try { data = await res.json() } catch { /* no body */ }
  return { status: res.status, data }
}

function client () {
  const jar = {}
  return {
    get: (p) => call(jar, 'GET', p),
    post: (p, b) => call(jar, 'POST', p, b),
    put: (p, b) => call(jar, 'PUT', p, b),
    jar
  }
}

async function loginAs (role) {
  const c = client()
  const r = await c.post('/api/auth/demo', { role })
  if (r.status !== 200) throw new Error(`demo login failed for ${role}`)
  return c
}

/**
 * The same database instance the running app uses (shared CJS require cache).
 * Lets tests read ground truth (e.g. correct answers) without weakening APIs.
 */
function db () {
  return require('../server/db.js')
}

module.exports = { start, stop, client, loginAs, db }
