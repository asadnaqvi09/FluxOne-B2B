import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Full notification inbox for Admin or Branch Manager
export function NotificationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all') // all | unread
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [mutating, setMutating] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await apiClient.get(endpoints.notifications.list, {
      limit: 100,
      unreadOnly: filter === 'unread' ? 'true' : undefined,
    })
    setLoading(false)
    if (res.success && res.data) {
      setItems(res.data.items || [])
      setUnreadCount(res.data.unreadCount || 0)
    } else {
      toastError(res.error || 'Failed to load notifications')
    }
  }, [filter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const markRead = async (id) => {
    await apiClient.patch(endpoints.notifications.read(id))
    void refresh()
  }

  const markAll = async () => {
    setMutating(true)
    await apiClient.patch(endpoints.notifications.readAll)
    setMutating(false)
    toastSuccess('All notifications marked as read')
    void refresh()
  }

  const removeOne = async () => {
    if (!deleteTarget) return
    setMutating(true)
    const res = await apiClient.delete(endpoints.notifications.remove(deleteTarget.id))
    setMutating(false)
    if (res.success) {
      toastSuccess('Notification deleted')
      setDeleteTarget(null)
      void refresh()
    } else {
      toastError(res.error || 'Failed to delete')
    }
  }

  const openItem = async (n) => {
    if (!n.isRead) await markRead(n.id)
    if (n.linkPath) navigate(n.linkPath)
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Inbox"
          title="Notifications"
          description="All alerts for your account — mark as read or delete"
          actions={
            unreadCount > 0 ? (
              <Button type="button" variant="outline" disabled={mutating} onClick={markAll}>
                Mark all as read
              </Button>
            ) : null
          }
        />
      </MotionHeader>

      <MotionReveal>
        <SurfaceCard title="Your notifications" description={`${unreadCount} unread`}>
          <div className="mb-4 flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'brand' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'unread' ? 'brand' : 'outline'}
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No notifications</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 py-3',
                    !n.isRead && 'bg-purple-50/30',
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer text-left"
                    onClick={() => openItem(n)}
                  >
                    <div className="flex items-center gap-2">
                      {!n.isRead ? (
                        <span className="size-2 shrink-0 rounded-full bg-[#8E238F]" />
                      ) : (
                        <span className="size-2 shrink-0" />
                      )}
                      <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    </div>
                    {n.body ? (
                      <p className="mt-0.5 pl-4 text-xs text-slate-600">{n.body}</p>
                    ) : null}
                    <p className="mt-1 pl-4 text-[11px] text-slate-400">
                      {formatDateTime(n.createdAt)}
                      {n.linkPath ? ' · Click to open' : ''}
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    {!n.isRead ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => markRead(n.id)}
                      >
                        Mark read
                      </Button>
                    ) : null}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-slate-400 hover:text-red-600"
                      onClick={() => setDeleteTarget(n)}
                      aria-label="Delete notification"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>
      </MotionReveal>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete notification?"
        description="This removes the notification from your inbox. It cannot be undone."
        confirmLabel="Delete"
        loading={mutating}
        onConfirm={removeOne}
      />
    </div>
  )
}

export default NotificationsPage
