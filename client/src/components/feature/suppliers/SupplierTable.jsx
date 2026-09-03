import { Building2, Pencil } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { BRAND } from '@/lib/constants'
import { displaySupplierRef } from '@/lib/formatDisplayId'
import { ProductStatusToggle } from '@/components/feature/products/ProductStatusToggle'

/**
 * Supplier list matching tech lead columns.
 */
export function SupplierTable({
  items = [],
  loading = false,
  pagination,
  onPageChange,
  onEdit,
  onStatusChange,
  statusUpdatingId = null,
  className,
}) {
  const list = Array.isArray(items) ? items : []
  const isEmpty = !loading && list.length === 0
  const page = pagination?.page || 1
  const pageCount = Math.max(1, pagination?.pageCount || 1)
  const total = pagination?.total ?? list.length

  return (
    <SurfaceCard
      className={className}
      title="Supplier list"
      description="Companies you purchase from"
      actions={
        <span className="text-xs font-medium text-slate-400">
          {total} records · 8 / page
        </span>
      }
    >
      {loading ? (
        <TableRowsSkeleton rows={5} />
      ) : isEmpty ? (
        <EmptyState
          icon={Building2}
          title="No suppliers yet"
          description="Add a supplier before generating purchase orders."
        />
      ) : (
        <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
          <Table className="min-w-[720px] text-left text-sm lg:min-w-[960px]">
            <TableHeader>
              <TableRow className="text-xs uppercase tracking-wide text-slate-400">
                <TableHead className="px-2 py-3 font-semibold">Image</TableHead>
                <TableHead className="px-2 py-3 font-semibold">Reference</TableHead>
                <TableHead className="px-2 py-3 font-semibold">Company</TableHead>
                <TableHead className="px-2 py-3 font-semibold">Company phone</TableHead>
                <TableHead className="px-2 py-3 font-semibold">Representative</TableHead>
                <TableHead className="px-2 py-3 font-semibold">Location</TableHead>
                <TableHead className="px-2 py-3 font-semibold">Tax paid</TableHead>
                <TableHead className="px-2 py-3 font-semibold">Reg / Bank</TableHead>
                <TableHead className="px-2 py-3 font-semibold">Signature</TableHead>
                <TableHead className="px-2 py-3 font-semibold">Status</TableHead>
                <TableHead className="px-2 py-3 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.id} className="align-top hover:bg-slate-50/80">
                  <TableCell className="px-2 py-3">
                    {row.imageUrl ? (
                      <img
                        src={row.imageUrl}
                        alt=""
                        className="size-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="flex size-10 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{
                          background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})`,
                        }}
                      >
                        {(row.companyName || '?').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-3 font-mono text-xs text-slate-600" title={row.id}>
                    {displaySupplierRef(row)}
                  </TableCell>
                  <TableCell className="px-2 py-3 font-medium text-slate-800">{row.companyName}</TableCell>
                  <TableCell className="px-2 py-3 text-slate-600">{row.companyPhone || '—'}</TableCell>
                  <TableCell className="px-2 py-3 text-slate-600">
                    <span className="block font-medium">{row.representativeName || '—'}</span>
                    <span className="block text-xs text-slate-400">
                      {row.representativePhone || '—'}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {row.representativeEmail || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-3 text-slate-600">{row.location || '—'}</TableCell>
                  <TableCell className="px-2 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.taxPaid
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {row.taxPaid ? 'Yes' : 'No'}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-3 text-xs text-slate-500">
                    <span className="block">{row.registrationNumber || '—'}</span>
                    <span className="block font-mono">{row.bankAccountNumber || '—'}</span>
                  </TableCell>
                  <TableCell className="px-2 py-3">
                    {row.signatureUrl ? (
                      <img
                        src={row.signatureUrl}
                        alt="Signature"
                        className="h-8 max-w-[72px] object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-3">
                    <ProductStatusToggle
                      status={row.isActive === false ? 'inactive' : 'active'}
                      loading={statusUpdatingId === row.id}
                      onChange={(status) =>
                        onStatusChange?.(row, status === 'active')
                      }
                    />
                  </TableCell>
                  <TableCell className="px-2 py-3">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={() => onEdit?.(row)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isEmpty ? (
        <TablePagination
          page={page}
          pageCount={pageCount}
          totalItems={total}
          loading={loading}
          onPageChange={onPageChange}
        />
      ) : null}
    </SurfaceCard>
  )
}
