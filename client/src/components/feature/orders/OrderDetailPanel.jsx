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
import { BRAND } from '@/lib/constants'
import { money } from '@/lib/mapProduct'

/**
 * View all lines on a purchase order + approve / cancel.
 */
export function OrderDetailPanel({
  open,
  onOpenChange,
  order = null,
  loading = false,
  onApprove,
  onCancel,
  onPrint,
}) {
  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Order {order.orderNumber}</DialogTitle>
          <DialogDescription>
            {order.companyName}
            {order.representativeName
              ? ` · ${order.representativeName}`
              : ''}
            {order.representativePhone ? ` · ${order.representativePhone}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[520px] text-left text-sm">
            <TableHeader>
              <TableRow className="bg-slate-50 text-xs uppercase text-slate-400">
                <TableHead className="px-3 py-2">Name / Id</TableHead>
                <TableHead className="px-3 py-2">Scale</TableHead>
                <TableHead className="px-3 py-2">Qty</TableHead>
                <TableHead className="px-3 py-2">Price</TableHead>
                <TableHead className="px-3 py-2">Last purchase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(order.lines || []).map((line) => (
                <TableRow key={line.id || line.productId}>
                  <TableCell className="px-3 py-2">
                    <span className="font-medium">{line.name}</span>
                    <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                      {line.itemCode}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2 capitalize">{line.scale}</TableCell>
                  <TableCell className="px-3 py-2">{line.quantity}</TableCell>
                  <TableCell className="px-3 py-2">{money(line.unitCost)}</TableCell>
                  <TableCell className="px-3 py-2 text-slate-500">{money(line.lastPurchasePrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {order.explanation ? (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">Explanation:</span> {order.explanation}
          </p>
        ) : null}

        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange?.(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={loading}
            onClick={() => onPrint?.(order)}
          >
            Download PDF
          </Button>
          {order.status === 'pending' ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer text-red-600"
                disabled={loading}
                onClick={() => onCancel?.(order)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="cursor-pointer text-white"
                style={{ background: BRAND.purple }}
                disabled={loading}
                onClick={() => onApprove?.(order)}
              >
                Approve
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
