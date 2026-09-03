import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { BRAND } from '@/lib/constants'
import { staffInitials } from '@/lib/mapBranchDashboard'
import { cn } from '@/lib/utils'

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  on_break: 'bg-amber-50 text-amber-700 ring-amber-200',
  offline: 'bg-slate-100 text-slate-600 ring-slate-200',
}

function statusLabel(status) {
  if (status === 'inactive') return 'Inactive'
  if (status === 'on_break') return 'On break'
  if (status === 'offline') return 'Offline'
  return 'Active'
}

const PAGE_SIZE = 8

export function StaffPerformanceTable({ staff = [], className }) {
  const [page, setPage] = useState(1)
  const list = Array.isArray(staff) ? staff : []
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const rows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return list.slice(start, start + PAGE_SIZE)
  }, [list, safePage])

  const isEmpty = list.length === 0

  return (
    <SurfaceCard
      className={cn('h-full flex flex-col justify-between', className)}
      bodyClassName="flex-1 flex flex-col justify-between"
      title="Staff List"
      description="Name, ID, status & points"
      actions={
        <span className="text-xs font-medium text-slate-400">
          {list.length} records · {PAGE_SIZE} / page
        </span>
      }
    >
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-slate-50/80 px-4 py-12 text-center">
          <div
            className="flex size-12 items-center justify-center rounded-full"
            style={{ background: 'rgba(142, 35, 143, 0.1)', color: BRAND.purple }}
          >
            <Users className="size-6" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-semibold text-slate-800">No staff available</p>
          <p className="max-w-xs text-xs text-slate-500">
            Staff assigned to this branch will appear here once loaded from the API.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div className="overflow-x-auto">
            <Table className="min-w-[32rem] text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs tracking-wide text-slate-500 uppercase">
                  <TableHead className="px-2 py-2.5 font-medium">Employee</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">ID</TableHead>
                  <TableHead className="px-2 py-2.5 font-medium">Status</TableHead>
                  <TableHead className="px-2 py-2.5 text-right font-medium">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((person) => (
                  <TableRow
                    key={person.id}
                    className="hover:bg-slate-50/80"
                  >
                    <TableCell className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        {person.image ? (
                          <img
                            src={person.image}
                            alt=""
                            className="size-9 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ background: BRAND.purple }}
                          >
                            {staffInitials(person.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{person.name}</p>
                          <p className="truncate text-xs text-slate-500">{person.role || 'Staff'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <span
                        className="inline-block font-mono text-[11px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 whitespace-nowrap"
                        title={person.id}
                      >
                        {person.id?.length > 12 ? `${person.id.slice(0, 8)}...` : person.id}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                          STATUS_STYLES[person.status] || STATUS_STYLES.offline,
                        )}
                      >
                        {statusLabel(person.status)}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-right font-semibold text-slate-900">
                      {Number(person.points || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={safePage}
            pageCount={totalPages}
            totalItems={list.length}
            onPageChange={setPage}
          />
        </div>
      )}
    </SurfaceCard>
  )
}
