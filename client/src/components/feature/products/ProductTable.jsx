import { Package, Pencil, Printer, Trash2 } from 'lucide-react'
import { BarcodeCell } from '@/components/feature/products/BarcodeCell'
import { PricingColumns } from '@/components/feature/products/PricingColumns'
import { ProductImageCell, ProductStatusToggle } from '@/components/feature/products/ProductStatusToggle'
import { PromotionColumns } from '@/components/feature/products/PromotionColumns'
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
import { money } from '@/lib/mapProduct'

export function ProductTable({
  items = [],
  loading = false,
  pagination,
  statusUpdatingId = null,
  onPageChange,
  onEdit,
  onPrintBarcode,
  onStatusChange,
  onDelete,
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
      title="Product catalog"
      description="Single items & bundles for this company"
      actions={
        <span className="text-xs font-medium text-slate-400">
          {total} records · 8 / page
        </span>
      }
    >
      {loading ? (
        <TableRowsSkeleton rows={6} />
      ) : isEmpty ? (
        <EmptyState
          icon={Package}
          title="No product available"
          description="Try another category or type, or add a single item / bundle to get started."
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {list.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
              >
                <div className="flex items-start gap-3">
                  <ProductImageCell src={row.imageUrl} name={row.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                        <p className="font-mono text-[11px] text-slate-400">{row.itemCode}</p>
                      </div>
                      <ProductStatusToggle
                        status={row.status}
                        loading={statusUpdatingId === row.id}
                        onChange={(status) => onStatusChange?.(row, status)}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.scale} · {row.type}
                    </p>
                    <div className="mt-2">
                      <PricingColumns row={row} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onPrintBarcode?.(row)}
                      >
                        <Printer className="size-3.5" />
                        PDF
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onEdit?.(row)}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="cursor-pointer text-red-600 hover:text-red-700"
                        onClick={() => onDelete?.(row)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[1100px] text-left text-sm">
              <TableHeader>
                <TableRow className="text-[11px] tracking-wide text-slate-500 uppercase">
                  <TableHead className="px-2 py-3 font-semibold">Image</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Scale</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Item code</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Barcode</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Prices</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Discount & offers</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Purchase vendors</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Selling</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Status</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-slate-50/80"
                  >
                    <TableCell className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <ProductImageCell src={row.imageUrl} name={row.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900" title={row.name}>
                            {row.name}
                          </p>
                          <p className="text-[11px] capitalize text-slate-400">{row.type}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-slate-700">{row.scale}</TableCell>
                    <TableCell className="px-2 py-3 font-mono text-xs text-slate-600">{row.itemCode}</TableCell>
                    <TableCell className="max-w-[120px] px-2 py-3">
                      <BarcodeCell value={row.barcode} />
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <PricingColumns row={row} />
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <PromotionColumns row={row} />
                    </TableCell>
                    <TableCell className="px-2 py-3 text-xs leading-snug">
                      <p>
                        <span className="text-slate-400">Last</span>{' '}
                        <span className="font-medium">{money(row.lastPurchasePrice)}</span>
                      </p>
                      <p className="truncate text-slate-600" title={row.lastSupplierName}>
                        {row.lastSupplierName || '—'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {row.lastPurchaseDate ? String(row.lastPurchaseDate).slice(0, 10) : ''}
                      </p>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-xs text-slate-600">
                      <p>
                        <span className="text-slate-400">Rate</span> {row.effectiveTaxRate ?? 0}%
                      </p>
                      <p>
                        <span className="text-slate-400">Tax</span>{' '}
                        {money(row.sellingPriceWithTax - row.sellingPriceWithoutTax)}
                      </p>
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <ProductStatusToggle
                        product={row}
                        loading={statusUpdatingId === row.id}
                        onChange={onStatusChange}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="cursor-pointer"
                          title="Download barcode PDF"
                          onClick={() => onPrintBarcode?.(row)}
                        >
                          <Printer className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="cursor-pointer"
                          title="Edit"
                          onClick={() => onEdit?.(row)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="cursor-pointer text-red-600 hover:text-red-700"
                          title="Delete"
                          onClick={() => onDelete?.(row)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={total}
            loading={loading}
            onPageChange={onPageChange}
          />
        </>
      )}
    </SurfaceCard>
  )
}
