import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { PATHS } from '@/router/paths'
import { useAuthSession } from '@/hooks/useAuthSession'
import { ROLES } from '@/lib/constants'
import { displayNotification } from '@/lib/notificationDisplay'
import { cn } from '@/lib/utils'

function formatRelative(value) {
  if (!value) return ''
  const then = new Date(value).getTime()
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Shared Admin + BM bell — dropdown + deep-link via notification.linkPath
export function NotificationBell({ className }) {
  const { role } = useAuthSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const rootRef = useRef(null)

  const notificationsPath =
    role === ROLES.B2B_ADMIN ? PATHS.admin.notifications : PATHS.branch.notifications

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await apiClient.get(endpoints.notifications.list, { limit: 8 })
    setLoading(false)
    if (res.success && res.data) {
      setItems(res.data.items || [])
      setUnreadCount(res.data.unreadCount || 0)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), 60_000)
    return () => clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const openDropdown = () => {
    setOpen((v) => !v)
    void refresh()
  }

  const handleClickItem = async (n) => {
    if (!n.isRead) {
      await apiClient.patch(endpoints.notifications.read(n.id))
    }
    setOpen(false)
    // Dynamic redirect — linkPath drives destination (future notification types)
    const target = n.linkPath || notificationsPath
    navigate(target)
    void refresh()
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative size-9 rounded-full text-slate-700 hover:bg-slate-100"
        aria-label="Notifications"
        onClick={openDropdown}
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute top-full right-0 z-50 mt-2 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="cursor-pointer text-xs font-medium text-[#8E238F] hover:underline"
                onClick={async () => {
                  await apiClient.patch(endpoints.notifications.readAll)
                  void refresh()
                }}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && !items.length ? (
              <p className="px-3 py-6 text-center text-xs text-slate-400">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-400">No notifications yet</p>
            ) : (
              items.map((n) => {
                const { title, body } = displayNotification(n)
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClickItem(n)}
                    className={cn(
                      'flex w-full cursor-pointer flex-col gap-1 border-b border-slate-100 px-3 py-2.5 text-left transition-colors hover:bg-slate-50',
                      !n.isRead && 'bg-purple-50/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug text-slate-900">{title}</p>
                      {!n.isRead ? (
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-[#8E238F]" />
                      ) : null}
                    </div>
                    {body ? (
                      <p className="whitespace-normal break-words text-xs leading-relaxed text-slate-600">
                        {body}
                      </p>
                    ) : null}
                    <p className="text-[11px] text-slate-400">{formatRelative(n.createdAt)}</p>
                  </button>
                )
              })
            )}
          </div>

          <button
            type="button"
            className="w-full cursor-pointer border-t border-border px-3 py-2.5 text-center text-xs font-semibold text-[#8E238F] hover:bg-slate-50"
            onClick={() => {
              setOpen(false)
              navigate(notificationsPath)
            }}
          >
            View all notifications
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default NotificationBell
