// Normalize notification display — short header + full gray detail body
export function displayNotification(n = {}) {
  const type = String(n.type || '')

  if (type === 'leave_request') {
    const detail =
      n.body && n.body !== n.title
        ? n.body
        : n.body || n.title || ''
    return {
      title: 'New Leave Request From Employee',
      body: detail,
    }
  }

  return {
    title: n.title || 'Notification',
    body: n.body && n.body !== n.title ? n.body : n.body || '',
  }
}
