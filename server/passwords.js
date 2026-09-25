/**
 * Password hashing (Node built-in scrypt) and verification-code hashing.
 * No plaintext password or OTP is ever stored; only salted hashes.
 */
const crypto = require('node:crypto')

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEYLEN = 64

function hashPassword (password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString('hex')
  return { salt, hash }
}

function verifyPassword (password, salt, expectedHash) {
  if (!salt || !expectedHash) return false
  const hash = crypto.scryptSync(String(password), salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
  const a = Buffer.from(hash)
  const b = Buffer.from(expectedHash, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** 6-digit code. Returns the plaintext (to deliver) plus its salted hash for storage. */
function generateOtp () {
  const code = String(crypto.randomInt(0, 1000000)).padStart(10, '0').slice(-6)
  const salt = crypto.randomBytes(8).toString('hex')
  const hash = crypto.scryptSync(code, salt, 32, { N: 4096, r: 8, p: 1 }).toString('hex')
  return { code, salt, hash }
}

/** Constant-time check of a candidate OTP against stored salt+hash. */
function verifyOtp (code, salt, expectedHash) {
  if (!salt || !expectedHash || typeof code !== 'string' || !/^\d{6}$/.test(code)) return false
  const candidate = crypto.scryptSync(code, salt, 32, { N: 4096, r: 8, p: 1 }).toString('hex')
  const a = Buffer.from(candidate, 'hex')
  const b = Buffer.from(expectedHash, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

module.exports = { hashPassword, verifyPassword, generateOtp, verifyOtp }
