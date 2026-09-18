import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Check,
  Download,
  Eye,
  Filter,
  Search,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { BRAND } from '@/lib/constants'
import { referenceFromUuid, displayStaffRef } from '@/lib/formatDisplayId'
import { toastError, toastSuccess } from '@/lib/toast'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'

function displayLeaveRef(row = {}) {
  return row.id ? referenceFromUuid(row.id, 'LV') : '—'
}

function displayLeaveStaffRef(row = {}) {
  return displayStaffRef({ id: row.requestedBy || row.staffId })
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatRange(start, end) {
  return `${formatDate(start)} - ${formatDate(end)}`
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function dayLabel(count) {
  const n = Number(count) || 0
  return `${n} ${n === 1 ? 'Day' : 'Days'}`
}

function statusBadgeClass(status) {
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

function exportCsv(rows) {
  const header = [
    'Leave ID',
    'Employee',
    'Branch',
    'Start',
    'End',
    'Days',
    'Applied On',
    'Status',
    'Reason',
  ]
  const lines = rows.map((r) =>
    [
      displayLeaveRef(r),
      r.managerName || '',
      r.branchName || '',
      String(r.startDate || '').slice(0, 10),
      String(r.endDate || '').slice(0, 10),
      r.dayCount ?? '',
      r.createdAt || '',
      r.status || '',
      (r.reason || '').replace(/"/g, '""'),
    ]
      .map((cell) => `"${cell}"`)
      .join(','),
  )
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leave-management-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function LeavesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight') || ''

  const [items, setItems] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutatingId, setMutatingId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('')
  const [showBranchFilter, setShowBranchFilter] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery.trim(), 300)

  const [viewRow, setViewRow] = useState(null)
  const [decideRow, setDecideRow] = useState(null)
  const [decideStatus, setDecideStatus] = useState('approved')
  const [decisionReason, setDecisionReason] = useState('')

  const fetchLeaves = useCallback(async () => {
    setLoading(true)
    const res = await apiClient.get(endpoints.admin.leaves.list, {
      branchId: branchFilter || undefined,
      q: debouncedQ || undefined,
    })
    setLoading(false)
    if (res.success) setItems(res.data || [])
    else toastError(res.error || 'Failed to load leave requests')
  }, [branchFilter, debouncedQ])

  useEffect(() => {
    void fetchLeaves()
  }, [fetchLeaves])

  useEffect(() => {
    void (async () => {
      const res = await apiClient.get(endpoints.admin.branches.list, { page: 1, limit: 100 })
      if (res.success) {
        const list = res.data?.items || res.data || []
        setBranches(Array.isArray(list) ? list : [])
      }
    })()
  }, [])

  const counts = useMemo(() => {
    const all = items.length
    const pending = items.filter((r) => r.status === 'pending').length
    const approved = items.filter((r) => r.status === 'approved').length
    const rejected = items.filter((r) => r.status === 'rejected').length
    return { all, pending, approved, rejected }
  }, [items])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return items
    return items.filter((r) => r.status === statusFilter)
  }, [items, statusFilter])

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pageRows,
  } = useClientPagination(filtered)

  useEffect(() => {
    setPage(1)
  }, [filtered.length, setPage])

  // Scroll/highlight when opened from a notification
  useEffect(() => {
    if (!highlightId || !items.length) return
    const match = items.find((r) => r.id === highlightId)
    if (match) {
      setViewRow(match)
      setStatusFilter(match.status === 'pending' ? 'pending' : 'all')
    }
  }, [highlightId, items])

  const openDecide = (row, status) => {
    setDecideRow(row)
    setDecideStatus(status)
    setDecisionReason('')
  }

  const submitDecide = async () => {
    if (!decideRow) return
    if (decideStatus === 'rejected' && !decisionReason.trim()) {
      return toastError('Please provide a rejection reason')
    }
    setMutatingId(decideRow.id)
    const res = await apiClient.patch(endpoints.admin.leaves.decide(decideRow.id), {
      status: decideStatus,
      decisionReason: decisionReason.trim() || null,
    })
    setMutatingId(null)
    if (res.success) {
      toastSuccess(decideStatus === 'approved' ? 'Leave approved' : 'Leave rejected')
      setDecideRow(null)
      setViewRow(null)
      if (highlightId) {
        searchParams.delete('highlight')
        setSearchParams(searchParams, { replace: true })
      }
      void fetchLeaves()
    } else {
      toastError(res.error || 'Failed to update leave request')
    }
  }

  const statusChips = [
    { id: 'all', label: `All (${counts.all})` },
    { id: 'pending', label: `Pending (${counts.pending})` },
    { id: 'approved', label: `Approved (${counts.approved})` },
    { id: 'rejected', label: `Rejected (${counts.rejected})` },
  ]

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Workforce"
          title="Leave Management"
          description="View and manage leave requests submitted by branch managers"
          actions={
            <Button
              type="button"
              variant="brand"
              onClick={() => exportCsv(filtered)}
              disabled={!filtered.length}
            >
              <Download className="mr-1.5 size-4" />
              Export
            </Button>
          }
        />
      </MotionHeader>

      <MotionReveal delay={0.04}>
        <SurfaceCard
          title="Leave Management"
          description="Branch manager personal leave requests awaiting or past Admin decision"
        >
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search by Leave ID or Employee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {statusChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id)}
                  className={cn(
                    'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    statusFilter === chip.id
                      ? 'border-transparent text-white'
                      : 'border-border bg-white text-slate-700 hover:bg-slate-50',
                  )}
                  style={
                    statusFilter === chip.id ? { backgroundColor: BRAND.purple } : undefined
                  }
                >
                  {chip.label}
                </button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBranchFilter((v) => !v)}
              >
                <Filter className="mr-1 size-3.5" />
                Filter
              </Button>
            </div>
          </div>

          {showBranchFilter ? (
            <div className="mb-4 max-w-xs">
              <Label className="mb-1.5 block text-xs text-slate-500">Branch</Label>
              <NativeSelect
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}

          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">Loading leave requests…</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No leave requests found</p>
          ) : (
            <ResponsiveDataShell
              mobile={pageRows.map((row) => (
                <DataCard
                  key={row.id}
                  className={cn(highlightId === row.id && 'ring-2 ring-purple-300')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-purple-800">
                        {displayLeaveRef(row)}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                        {row.managerName || 'Branch Manager'}
                      </p>
                      <p className="text-[11px] text-slate-500">{displayLeaveStaffRef(row)}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {row.branchName || '—'}
                        {row.branchLocation ? ` / ${row.branchLocation}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {formatRange(row.startDate, row.endDate)} · {dayLabel(row.dayCount)}
                      </p>
                    </div>
                    <Badge className={cn('border', statusBadgeClass(row.status))}>
                      {row.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setViewRow(row)}>
                      <Eye className="mr-1 size-3.5" />
                      View
                    </Button>
                    {row.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                          disabled={mutatingId === row.id}
                          onClick={() => openDecide(row, 'approved')}
                        >
                          <Check className="mr-1 size-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-red-600"
                          disabled={mutatingId === row.id}
                          onClick={() => openDecide(row, 'rejected')}
                        >
                          <X className="mr-1 size-3.5" />
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                </DataCard>
              ))}
              desktop={
                <Table className="w-full min-w-[64rem] text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="px-3 py-2 font-medium">Leave ID</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Employee Name</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Branch</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Duration Dates</TableHead>
                      <TableHead className="px-3 py-2 font-medium">No. of days</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Applied On</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Status</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          'hover:bg-slate-50/50',
                          highlightId === row.id && 'bg-purple-50/60',
                        )}
                      >
                        <TableCell className="px-3 py-3 font-mono text-xs font-bold text-purple-800">
                          {displayLeaveRef(row)}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={
                                row.managerImageUrl ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.managerName || 'BM')}`
                              }
                              alt=""
                              className="size-9 rounded-full object-cover ring-1 ring-slate-200"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">
                                {row.managerName || 'Branch Manager'}
                              </p>
                              <p className="text-[11px] text-slate-500">{displayLeaveStaffRef(row)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <p className="font-medium text-slate-800">{row.branchName || '—'}</p>
                          <p className="text-[11px] text-slate-500">{row.branchLocation || ''}</p>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">
                          {formatRange(row.startDate, row.endDate)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">
                          {dayLabel(row.dayCount)}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-600">
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <Badge className={cn('border capitalize', statusBadgeClass(row.status))}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-purple-800"
                              onClick={() => setViewRow(row)}
                            >
                              <Eye className="mr-1 size-3.5" />
                              View
                            </Button>
                            {row.status === 'pending' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-emerald-700"
                                  disabled={mutatingId === row.id}
                                  onClick={() => openDecide(row, 'approved')}
                                >
                                  <Check className="mr-1 size-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-red-600"
                                  disabled={mutatingId === row.id}
                                  onClick={() => openDecide(row, 'rejected')}
                                >
                                  <X className="mr-1 size-3.5" />
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <span className="px-2 text-xs text-slate-400">--</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              }
            />
          )}

          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </SurfaceCard>
      </MotionReveal>

      {/* View details */}
      <Dialog open={!!viewRow} onOpenChange={(open) => !open && setViewRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Details — {displayLeaveRef(viewRow || {})}</DialogTitle>
            <DialogDescription>Branch manager personal leave request</DialogDescription>
          </DialogHeader>
          {viewRow ? (
            <div className="space-y-2 py-2 text-sm">
              <p>
                <span className="text-slate-500">Employee:</span>{' '}
                <strong>{viewRow.managerName}</strong> ({displayLeaveStaffRef(viewRow)})
              </p>
              <p>
                <span className="text-slate-500">Branch:</span>{' '}
                {viewRow.branchName || '—'}
                {viewRow.branchLocation ? ` / ${viewRow.branchLocation}` : ''}
              </p>
              <p>
                <span className="text-slate-500">Dates:</span>{' '}
                {formatRange(viewRow.startDate, viewRow.endDate)} ({dayLabel(viewRow.dayCount)})
              </p>
              <p>
                <span className="text-slate-500">Applied:</span> {formatDateTime(viewRow.createdAt)}
              </p>
              <p>
                <span className="text-slate-500">Reason:</span> {viewRow.reason || '—'}
              </p>
              <p>
                <span className="text-slate-500">Status:</span>{' '}
                <Badge className={cn('border capitalize', statusBadgeClass(viewRow.status))}>
                  {viewRow.status}
                </Badge>
              </p>
              {viewRow.decisionReason ? (
                <p>
                  <span className="text-slate-500">Admin note:</span> {viewRow.decisionReason}
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <DialogCancelButton onClick={() => setViewRow(null)}>Close</DialogCancelButton>
            {viewRow?.status === 'pending' ? (
              <>
                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => openDecide(viewRow, 'approved')}
                >
                  Approve
                </Button>
                <Button variant="outline" className="text-red-600" onClick={() => openDecide(viewRow, 'rejected')}>
                  Reject
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve / Reject */}
      <Dialog open={!!decideRow} onOpenChange={(open) => !open && setDecideRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decideStatus === 'approved' ? 'Approve leave request' : 'Reject leave request'}
            </DialogTitle>
            <DialogDescription>
              {decideRow
                ? `${decideRow.managerName} · ${formatRange(decideRow.startDate, decideRow.endDate)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>
              {decideStatus === 'rejected' ? 'Rejection reason *' : 'Note (optional)'}
            </Label>
            <Input
              placeholder={
                decideStatus === 'rejected'
                  ? 'Explain why this leave is rejected'
                  : 'Optional note for the branch manager'
              }
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogCancelButton onClick={() => setDecideRow(null)}>Cancel</DialogCancelButton>
            <Button
              variant="brand"
              disabled={mutatingId === decideRow?.id}
              onClick={submitDecide}
              className={
                decideStatus === 'rejected'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : undefined
              }
            >
              {mutatingId === decideRow?.id
                ? 'Saving…'
                : decideStatus === 'approved'
                  ? 'Confirm Approve'
                  : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LeavesPage
