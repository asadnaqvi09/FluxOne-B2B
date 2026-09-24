import { Package, Printer } from 'lucide-react'
import { BarcodeCell } from '@/components/feature/products/BarcodeCell'
import { PricingColumns } from '@/components/feature/products/PricingColumns'
import { ProductImageCell, ProductStatusToggle } from '@/components/feature/products/ProductStatusToggle'
import { PromotionColumns } from '@/components/feature/products/PromotionColumns'
import { ActionIconButton } from '@/components/shared/ActionIconButton'
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
  TableActionsHead,
  TableActionsCell,
  TablePagination,
} from '@/components/ui/table'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { formatInventoryStock, money } from '@/lib/mapProduct'
import { displayItemCode } from '@/lib/formatDisplayId'

// Print / Edit / Delete for one catalog row
function ProductRowActions({ row, onPrintBarcode, onEdit, onDelete }) {
  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        title="Download barcode PDF"
        aria-label="Download barcode PDF"
        onClick={() => onPrintBarcode?.(row)}
      >
        <Printer className="size-4" />
      </Button>
      <ActionIconButton
        action="edit"
        label="Edit product"
        className="size-8"
        onClick={() => onEdit?.(row)}
      />
      <ActionIconButton
        action="delete"
        label="Delete product"
        className="size-8"
        onClick={() => onDelete?.(row)}
      />
    </>
  )
}

function InventoryStockCell({ row, className = '' }) {
  const stock = formatInventoryStock(row.quantity, row.reorderPoint, row.scale)
  return (
    <span
      className={`text-xs font-medium whitespace-nowrap ${stock.className} ${className}`.trim()}
      title={stock.display}
    >
      {stock.display}
    </span>
  )
}

export function ProductTable({
  items = [],
  loading = false,
  pagination,
  statusUpdatingId = null,
  onPageChange,
  onPageSizeChange,
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
  const pageSize = pagination?.limit || 8

  return (
    <SurfaceCard
      className={className}
      title="Product catalog"
      description="Single items & bundles for this company"
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
                        <p className="font-mono text-[11px] text-slate-400">{displayItemCode(row)}</p>
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
                    <div className="mt-2 space-y-1 text-xs leading-snug text-slate-600">
                      <p>
                        <span className="text-slate-400">Last purchase</span>{' '}
                        {money(row.lastPurchasePrice)}
                        {row.lastPurchaseVendorName ? ` · ${row.lastPurchaseVendorName}` : ''}
                      </p>
                      <p>
                        <span className="text-slate-400">Current purchase</span>{' '}
                        {money(row.purchasePrice)}
                        {row.currentPurchaseVendorName
                          ? ` · ${row.currentPurchaseVendorName}`
                          : ''}
                      </p>
                      <p>
                        <span className="text-slate-400">Last selling</span>{' '}
                        {money(row.lastSellingPrice)}
                      </p>
                      <p>
                        <span className="text-slate-400">Current selling</span>{' '}
                        {money(row.sellingPrice)}
                      </p>
                      <p>
                        <span className="text-slate-400">Inventory stock</span>{' '}
                        <InventoryStockCell row={row} />
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      <ProductRowActions
                        row={row}
                        onPrintBarcode={onPrintBarcode}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {/* Desktop table — Action uses nowrap cell so Delete is not clipped */}
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[1280px] text-left text-sm">
              <TableHeader>
                <TableRow className="text-[11px] tracking-wide text-slate-500 uppercase">
                  <TableHead className="px-2 py-3 font-semibold">Name</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Scale</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Item code</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Barcode</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Prices</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Discount & offers</TableHead>
                  <TableHead className="px-2 py-3 font-semibold">
                    Last / Current purchase
                  </TableHead>
                  <TableHead className="px-2 py-3 font-semibold">
                    Last / Current selling
                  </TableHead>
                  <TableHead className="px-2 py-3 font-semibold whitespace-nowrap">
                    Inventory Stock
                  </TableHead>
                  <TableHead className="px-2 py-3 font-semibold">Status</TableHead>
                  <TableActionsHead className="px-2 py-3 font-semibold">Action</TableActionsHead>
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
                    <TableCell className="px-2 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {displayItemCode(row)}
                    </TableCell>
                    <TableCell className="max-w-[140px] px-2 py-3 whitespace-nowrap">
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
                      <p
                        className="truncate text-slate-600"
                        title={row.lastPurchaseVendorName || undefined}
                      >
                        {row.lastPurchaseVendorName || '—'}
                      </p>
                      <p className="mt-1.5">
                        <span className="text-slate-400">Current</span>{' '}
                        <span className="font-medium">{money(row.purchasePrice)}</span>
                      </p>
                      <p
                        className="truncate text-slate-600"
                        title={row.currentPurchaseVendorName || undefined}
                      >
                        {row.currentPurchaseVendorName || '—'}
                      </p>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-xs leading-snug text-slate-600">
                      <p>
                        <span className="text-slate-400">Last</span>{' '}
                        <span className="font-medium text-slate-800">
                          {money(row.lastSellingPrice)}
                        </span>
                      </p>
                      <p className="mt-1">
                        <span className="text-slate-400">Current</span>{' '}
                        <span className="font-medium text-slate-800">
                          {money(row.sellingPrice)}
                        </span>
                      </p>
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <InventoryStockCell row={row} />
                    </TableCell>
                    <TableCell className="px-2 py-3">
                      <ProductStatusToggle
                        status={row.status}
                        loading={statusUpdatingId === row.id}
                        onChange={(status) => onStatusChange?.(row, status)}
                      />
                    </TableCell>
                    <TableActionsCell>
                      <ProductRowActions
                        row={row}
                        onPrintBarcode={onPrintBarcode}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </TableActionsCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={total}
            pageSize={pageSize}
            loading={loading}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </SurfaceCard>
  )
}
