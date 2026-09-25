/**
 * OTP delivery provider abstraction.
 *
 * No email/SMS provider is configured in this environment, so delivery falls
 * back to a DEVELOPMENT-ONLY mode: the code is returned in the API response and
 * printed to the server log, and every surface labels it clearly as
 * development-only. No code is claimed to have been emailed or messaged.
 *
 * To enable real delivery, set SMTP_URL / OTP_SMS_API_KEY etc. and add a
 * transport in `deliver()`.
 */
const https = require('node:https')

function providerConfig () {
  return {
    smtpConfigured: Boolean(process.env.SMTP_URL),
    smsConfigured: Boolean(process.env.OTP_SMS_API_KEY)
  }
}

function isLive () {
  const { smtpConfigured, smsConfigured } = providerConfig()
  return smtpConfigured || smsConfigured
}

/**
 * Deliver an OTP. Returns { delivered: boolean, channel, dev_code?: string }.
 * `dev_code` is ONLY present in development fallback mode and is rendered in
 * the UI as a labelled development hint, never presented as a real message.
 */
async function deliver ({ email, code, purpose }) {
  const cfg = providerConfig()
  if (cfg.smtpConfigured) {
    // Real SMTP transport would go here (not implemented — no credentials).
    // Fail closed rather than pretend.
    return { delivered: false, channel: 'email', error: 'SMTP transport not implemented in this build.' }
  }
  if (cfg.smsConfigured) {
    return { delivered: false, channel: 'sms', error: 'SMS transport not implemented in this build.' }
  }
  console.log(`[otp:dev-only] purpose=${purpose} email=${email} code=${code} (development fallback — NOT sent by email/SMS)`)
  return { delivered: false, channel: 'dev', dev_code: code }
}

module.exports = { deliver, isLive, providerConfig }
