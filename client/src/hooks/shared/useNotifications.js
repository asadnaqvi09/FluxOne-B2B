import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

export async function fetchNotifications({ limit = 100, unreadOnly } = {}) {
  return apiClient.get(endpoints.notifications.list, {
    limit,
    unreadOnly: unreadOnly ? 'true' : undefined,
  })
}

export async function markNotificationRead(id) {
  return apiClient.patch(endpoints.notifications.read(id))
}

export async function markAllNotificationsRead() {
  return apiClient.patch(endpoints.notifications.readAll)
}

export function useNotificationsInbox({ filter = 'all', onLoadError } = {}) {
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await fetchNotifications({
      limit: 100,
      unreadOnly: filter === 'unread',
    })
    setLoading(false)
    if (res.success && res.data) {
      setItems(res.data.items || [])
      setUnreadCount(res.data.unreadCount || 0)
    } else if (!res.success) {
      onLoadError?.(res.error || 'Failed to load notifications')
    }
    return res
  }, [filter, onLoadError])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const markRead = useCallback(
    async (id) => {
      const res = await markNotificationRead(id)
      if (res.success) void refresh()
      return res
    },
    [refresh],
  )

  const markAll = useCallback(async () => {
    setMutating(true)
    const res = await markAllNotificationsRead()
    setMutating(false)
    if (res.success) void refresh()
    return res
  }, [refresh])

  return {
    items,
    unreadCount,
    loading,
    mutating,
    refresh,
    markRead,
    markAll,
  }
}
