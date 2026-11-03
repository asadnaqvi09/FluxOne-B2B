import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import { BranchCapsule } from '@/components/shared/BranchRoleCapsules'
import { displayNotification } from '@/lib/notificationDisplay'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { cn } from '@/lib/utils'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { useCallback, useState } from 'react'
import { useNotificationsInbox } from '@/hooks/shared/useNotifications'

// Full notification inbox — mark as read only (no wipe / delete from inbox)
export function NotificationsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all') // all | unread
  const onLoadError = useCallback(
    (message) => toastError(message || 'Failed to load notifications'),
    [],
  )
  const { items, unreadCount, loading, mutating, markRead, markAll } = useNotificationsInbox({
    filter,
    onLoadError,
  })

  const handleMarkRead = async (id) => {
    const res = await markRead(id)
    if (!res.success) {
      toastError(res.error || 'Failed to mark as read')
    }
  }

  // Production pattern — mark all read, never delete the inbox
  const handleMarkAll = async () => {
    const res = await markAll()
    if (!res.success) {
      toastError(res.error || 'Failed to mark all as read')
      return
    }
    toastSuccess('All notifications marked as read')
  }

  const openItem = async (n) => {
    if (!n.isRead) await handleMarkRead(n.id)
    if (n.linkPath) navigate(n.linkPath)
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Inbox"
          title="Notifications"
          description="All alerts for your account — mark as read to clear the unread badge"
          actions={
            unreadCount > 0 ? (
              <Button type="button" variant="outline" disabled={mutating} onClick={handleMarkAll}>
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
            <TableRowsSkeleton rows={4} className="px-1" />
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No notifications</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const { title, body, branchName } = displayNotification(n)
                return (
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
                        <p className="text-sm font-semibold text-slate-900">{title}</p>
                      </div>
                      {branchName ? (
                        <div className="mt-1 min-w-0 max-w-full pl-4">
                          <BranchCapsule branchName={branchName} />
                        </div>
                      ) : null}
                      {body ? (
                        <p className="mt-0.5 pl-4 whitespace-normal break-words text-xs leading-relaxed text-slate-600">
                          {body}
                        </p>
                      ) : null}
                      <div className="mt-1 pl-4 text-[11px] text-slate-400">
                        <DateTimeLines
                          value={n.createdAt}
                          timeClassName="text-[11px] text-slate-400"
                        />
                        {n.linkPath ? (
                          <span className="mt-0.5 block">Click to open</span>
                        ) : null}
                      </div>
                    </button>
                    <div className="flex shrink-0 gap-1">
                      {!n.isRead ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => handleMarkRead(n.id)}
                        >
                          Mark read
                        </Button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}

export default NotificationsPage
