import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RowActionButtons } from '@/components/shared/ActionIconButton'
import { HolidayFormDialog } from '@/components/feature/branch/staff/HolidayFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { toastError, toastSuccess } from '@/lib/toast'
import { useClientPagination } from '@/hooks/useClientPagination'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function toInputDate(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

export function StaffHolidaysTab({
  designations = [],
  staff = [],
  createOpen = false,
  onCreateOpenChange,
}) {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [listSearch, setListSearch] = useState('')

  // Edit modal state (single holiday date/name)
  const [editing, setEditing] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchHolidays = async () => {
    setLoading(true)
    const res = await apiClient.get('/branch/holidays')
    setLoading(false)
    if (res.success) setHolidays(res.data || [])
  }

  useEffect(() => {
    void fetchHolidays()
  }, [])

  const filteredList = useMemo(() => {
    const q = listSearch.trim().toLowerCase()
    if (!q) return holidays
    return holidays.filter((h) => String(h.name || '').toLowerCase().includes(q))
  }, [holidays, listSearch])

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pageRows,
  } = useClientPagination(filteredList)

  useEffect(() => {
    setPage(1)
  }, [listSearch, setPage])

  const openEdit = (row) => {
    setEditing(row)
    setEditName(row.name || '')
    setEditDate(toInputDate(row.holidayDate))
  }

  const handleUpdateHoliday = async () => {
    if (!editing) return
    if (!editName.trim()) return toastError('Holiday name is required')
    if (!editDate) return toastError('Holiday date is required')
    setMutating(true)
    const res = await apiClient.put(`/branch/holidays/${editing.id}`, {
      name: editName.trim(),
      holidayDate: editDate,
    })
    setMutating(false)
    if (res.success) {
      toastSuccess('Holiday updated')
      setEditing(null)
      void fetchHolidays()
    } else {
      toastError(res.error || 'Failed to update holiday')
    }
  }

  const handleDeleteHoliday = async () => {
    if (!deleteTarget) return
    setMutating(true)
    const res = await apiClient.delete(`/branch/holidays/${deleteTarget.id}`)
    setMutating(false)
    if (res.success) {
      toastSuccess('Holiday deleted')
      setDeleteTarget(null)
      void fetchHolidays()
    } else {
      toastError(res.error || 'Failed to delete holiday')
    }
  }

  return (
    <div className="space-y-4">
      <SurfaceCard
        title="Branch Holiday Schedule"
        description="Scheduled store closures and holidays"
      >
        <div className="mb-4">
          <Input
            placeholder="Filter holidays by name…"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
        ) : filteredList.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No holidays scheduled</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {pageRows.map((h) => (
                <article
                  key={h.id}
                  className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{h.name}</p>
                        <p className="mt-1 text-xs text-slate-600">{formatDate(h.holidayDate)}</p>
                      </div>
                      <RowActionButtons
                        onEdit={() => openEdit(h)}
                        onDelete={() => setDeleteTarget(h)}
                      />
                    </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table className="w-full text-left text-sm">
                <TableHeader>
                  <TableRow className="text-xs text-slate-500 uppercase">
                    <TableHead className="px-3 py-2 font-medium">Holiday Date</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Holiday Name</TableHead>
                    <TableHead className="px-3 py-2 font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((h) => (
                    <TableRow key={h.id} className="hover:bg-slate-50/50">
                      <TableCell className="px-3 py-3 font-semibold text-slate-900">
                        {formatDate(h.holidayDate)}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-slate-700">{h.name}</TableCell>
                        <TableCell className="px-3 py-3">
                          <RowActionButtons
                            onEdit={() => openEdit(h)}
                            onDelete={() => setDeleteTarget(h)}
                          />
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
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

      {/* Create — driven by page header “Add Holidays” CTA */}
      <HolidayFormDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        designations={designations}
        staff={staff}
        onSuccess={fetchHolidays}
      />

      {/* Edit holiday */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Holiday</DialogTitle>
            <DialogDescription>Update holiday name or date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Holiday Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Holiday Date</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogCancelButton onClick={() => setEditing(null)}>Cancel</DialogCancelButton>
            <Button
              onClick={handleUpdateHoliday}
              disabled={mutating}
              variant="brand"
            >
              {mutating ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete holiday?"
        description={
          deleteTarget
            ? `Remove “${deleteTarget.name}” on ${formatDate(deleteTarget.holidayDate)} and clear related holiday attendance marks.`
            : ''
        }
        confirmLabel="Delete"
        loading={mutating}
        onConfirm={handleDeleteHoliday}
      />
    </div>
  )
}

export default StaffHolidaysTab
