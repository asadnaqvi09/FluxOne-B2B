import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { displayItemCode } from '@/lib/formatDisplayId'
import { money } from '@/lib/mapProduct'
import { cn } from '@/lib/utils'

// Status chip for detail header (approved → Accepted)
function statusLabel(status) {
  if (status === 'approved') return 'Accepted'
  return status || '—'
}

function statusClass(status) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700'
  if (status === 'received') return 'bg-sky-50 text-sky-700'
  if (status === 'cancelled') return 'bg-slate-100 text-slate-500'
  return 'bg-amber-50 text-amber-800'
}

// View order lines — read-only (no approve / cancel; generate auto-accepts)
export function OrderDetailPanel({
  open,
  onOpenChange,
  order = null,
  loading = false,
  onPrint,
}) {
  if (!order) return null

  const lines = order.lines || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Order {order.orderNumber}</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                statusClass(order.status),
              )}
            >
              {statusLabel(order.status)}
            </span>
          </DialogTitle>
          <DialogDescription>
            {order.companyName}
            {order.representativeName
              ? ` · ${order.representativeName}`
              : ''}
            {order.representativePhone ? ` · ${order.representativePhone}` : ''}
          </DialogDescription>
        </DialogHeader>

        <ResponsiveDataShell
          mobile={lines.map((line) => (
            <DataCard key={line.id || line.productId}>
              <p className="text-sm font-medium text-slate-900">{line.name}</p>
              <p className="font-mono text-[11px] text-slate-400">{displayItemCode(line)}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">Scale</span>
                  <p className="capitalize font-medium text-slate-800">{line.scale}</p>
                </div>
                <div>
                  <span className="text-slate-400">Qty</span>
                  <p className="font-medium text-slate-800">{line.quantity}</p>
                </div>
                <div>
                  <span className="text-slate-400">Price</span>
                  <p className="font-medium text-slate-800">{money(line.unitCost)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Last purchase</span>
                  <p className="font-medium text-slate-800">{money(line.lastPurchasePrice)}</p>
                </div>
              </div>
            </DataCard>
          ))}
          desktop={
            <div className="rounded-xl border border-border">
              <Table className="min-w-[520px] text-left text-sm">
                <TableHeader>
                  <TableRow className="bg-slate-50 text-xs uppercase text-slate-400">
                    <TableHead className="px-3 py-2">Name</TableHead>
                    <TableHead className="px-3 py-2">Scale</TableHead>
                    <TableHead className="px-3 py-2">Qty</TableHead>
                    <TableHead className="px-3 py-2">Price</TableHead>
                    <TableHead className="px-3 py-2">Last purchase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id || line.productId}>
                      <TableCell className="px-3 py-2">
                        <span className="font-medium">{line.name}</span>
                        <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                          {displayItemCode(line)}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2 capitalize">{line.scale}</TableCell>
                      <TableCell className="px-3 py-2">{line.quantity}</TableCell>
                      <TableCell className="px-3 py-2">{money(line.unitCost)}</TableCell>
                      <TableCell className="px-3 py-2 text-slate-500">
                        {money(line.lastPurchasePrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        />

        {order.explanation ? (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">Explanation:</span> {order.explanation}
          </p>
        ) : null}

        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer sm:w-auto"
            onClick={() => onOpenChange?.(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer sm:w-auto"
            disabled={loading}
            onClick={() => onPrint?.(order)}
          >
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
