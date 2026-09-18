import nodemailer from 'nodemailer'
import { buildLoginCredentialsEmail } from './templates/login.email.js'
import { buildLeaveDecisionEmail } from './templates/leave-decision.email.js'

let transporter = null

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function getTransporter() {
  if (!smtpConfigured()) return null
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return transporter
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@fluxone.local'

  if (!smtpConfigured()) {
    console.info('[mail] SMTP not configured — stubbing email', { to, subject })
    return { sent: false, stubbed: true }
  }

  try {
    const tx = getTransporter()
    await tx.sendMail({ from, to, subject, text, html })
    console.info('[mail] Email sent', { to, subject })
    return { sent: true, stubbed: false }
  } catch (err) {
    console.error('[mail] Failed to send email (non-blocking):', err?.message || err)
    return { sent: false, stubbed: false, error: err?.message || 'send failed' }
  }
}

// Send login credentials. Never throws for transport failures — create/reset must not block.
export async function sendLoginCredentialsEmail(payload) {
  const { subject, text, html } = buildLoginCredentialsEmail(payload)
  const result = await sendMail({ to: payload.loginEmail, subject, text, html })
  if (!result.sent && result.stubbed) {
    console.info('[mail] Stub credentials payload', {
      loginEmail: payload.loginEmail,
      temporaryPassword: payload.temporaryPassword,
      branchName: payload.branchName,
    })
  }
  if (!result.sent && !result.stubbed) {
    console.info('[mail] Fallback log for manual delivery', {
      to: payload.loginEmail,
      loginEmail: payload.loginEmail,
      temporaryPassword: payload.temporaryPassword,
    })
  }
  return result
}

// Notify BM by email when Admin approves/rejects their leave (non-blocking).
export async function sendLeaveDecisionEmail(payload) {
  const { subject, text, html } = buildLeaveDecisionEmail(payload)
  return sendMail({ to: payload.toEmail, subject, text, html })
}
