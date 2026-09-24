const crypto = require('node:crypto')

const SECRET = process.env.AUTH_SECRET || 'statwise-demo-secret-not-for-production'
const COOKIE_NAME = 'statwise_session'

function sign (payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${mac}`
}

function verify (token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, mac] = parts
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  try {
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null
  } catch {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (payload.exp && Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

function createSession (res, user) {
  const token = sign({ sub: user.id, role: user.role, name: user.name, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`)
  return token
}

function destroySession (res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

function parseCookies (req) {
  const header = req.headers.cookie || ''
  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}

function getSessionUser (req) {
  const token = parseCookies(req)[COOKIE_NAME]
  return verify(token)
}

/** Attach req.user when a valid session cookie exists. */
function sessionMiddleware (req, _res, next) {
  req.user = getSessionUser(req)
  next()
}

/**
 * Backend authorization gate. 401 when unauthenticated, 403 when role not allowed.
 * This is the enforced security boundary — frontend checks are cosmetic only.
 */
function requireRole (...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden for your role' })
    }
    next()
  }
}

module.exports = { sign, verify, createSession, destroySession, getSessionUser, sessionMiddleware, requireRole, COOKIE_NAME }
