export function buildLeaveDecisionEmail({
  recipientName,
  status,
  startDate,
  endDate,
  reason,
  decisionReason,
  branchName,
  companyName,
  decidedByName,
}) {
  const approved = status === 'approved'
  const safeName = recipientName || 'there'
  const subject = approved
    ? `Leave approved — ${companyName || 'FluxOne'}`
    : `Leave rejected — ${companyName || 'FluxOne'}`

  const range = formatRange(startDate, endDate)
  const statusLabel = approved ? 'Approved' : 'Rejected'

  const text = [
    `Hi ${safeName},`,
    '',
    `Your leave request has been ${statusLabel.toLowerCase()}.`,
    '',
    `Branch: ${branchName || '—'}`,
    `Dates: ${range}`,
    reason ? `Your reason: ${reason}` : null,
    decisionReason ? `Admin note: ${decisionReason}` : null,
    decidedByName ? `Decided by: ${decidedByName}` : null,
    '',
    `— ${companyName || 'FluxOne Inventory'}`,
  ]
    .filter(Boolean)
    .join('\n')

  const accent = approved ? '#059669' : '#dc2626'

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${subject}</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
    <tr><td>
      <p style="margin:0 0 12px;font-size:14px;color:#64748b;">FluxOne Inventory</p>
      <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Leave ${escapeHtml(statusLabel)}</h1>
      <p style="margin:0 0 16px;">Hi ${escapeHtml(safeName)}, your leave request has been
        <strong style="color:${accent};">${escapeHtml(statusLabel.toLowerCase())}</strong>.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px;margin:0 0 20px;">
        <tr><td style="padding:4px 0;font-size:14px;"><strong>Branch</strong><br/>${escapeHtml(branchName || '—')}</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;"><strong>Dates</strong><br/>${escapeHtml(range)}</td></tr>
        ${reason ? `<tr><td style="padding:4px 0;font-size:14px;"><strong>Your reason</strong><br/>${escapeHtml(reason)}</td></tr>` : ''}
        ${decisionReason ? `<tr><td style="padding:4px 0;font-size:14px;"><strong>Admin note</strong><br/>${escapeHtml(decisionReason)}</td></tr>` : ''}
      </table>
      <p style="margin:0;font-size:12px;color:#94a3b8;">You can also review this in the Branch Manager app under My Leave.</p>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}

function formatRange(start, end) {
  const a = String(start || '').slice(0, 10)
  const b = String(end || '').slice(0, 10)
  if (!a || !b) return '—'
  return a === b ? a : `${a} – ${b}`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
