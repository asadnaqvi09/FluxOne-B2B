import { useState } from 'react'
import { Plus } from 'lucide-react'
import { GenerateOrderDialog } from '@/components/feature/orders/GenerateOrderDialog'
import { OrderDetailPanel } from '@/components/feature/orders/OrderDetailPanel'
import { OrderFilters } from '@/components/feature/orders/OrderFilters'
import { OrderTable } from '@/components/feature/orders/OrderTable'
import { PurchaseHistoryList } from '@/components/feature/orders/PurchaseHistoryList'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders'
import { toastError, toastSuccess } from '@/lib/toast'

export function PurchaseOrdersPage() {
  const {
    items,
    pagination,
    loading,
    mutating,
    error,
    selected,
    history,
    supplierOptions,
    productOptions,
    filters,
    updateFilters,
    setPage,
    loadFormOptions,
    fetchDetail,
    fetchHistory,
    clearDetail,
    generateOrder,
    approveOrder,
    cancelOrder,
    printOrder,
  } = usePurchaseOrders()

  const [generateOpen, setGenerateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  async function openGenerate() {
    await loadFormOptions()
    setGenerateOpen(true)
  }

  async function handleGenerate(payload) {
    const { printAfter, ...body } = payload
    const result = await generateOrder(body)
    if (result.success) {
      toastSuccess('Purchase order created')
      if (printAfter && result.data?.id) {
        const printResult = await printOrder(result.data.id)
        if (!printResult.success) toastError(printResult.error || 'PDF download failed')
        else toastSuccess('Order PDF downloaded')
      }
    } else {
      toastError(result.error || 'Failed to create order')
    }
    return result
  }

  async function handleView(row) {
    const result = await fetchDetail(row.id)
    if (result.success) setDetailOpen(true)
    else toastError(result.error || 'Failed to load detail')
  }

  async function handleHistory(row) {
    const result = await fetchHistory(row.id)
    if (result.success) setHistoryOpen(true)
    else toastError(result.error || 'Failed to load history')
  }

  async function handlePrint(row) {
    const result = await printOrder(row)
    if (!result.success) toastError(result.error || 'PDF download failed')
    else toastSuccess('Order PDF downloaded')
  }

  async function handleApprove(order) {
    const result = await approveOrder(order.id)
    if (result.success) {
      toastSuccess('Order approved')
      await fetchDetail(order.id)
    } else toastError(result.error || 'Approve failed')
  }

  async function handleCancel(order) {
    const result = await cancelOrder(order.id)
    if (result.success) {
      toastSuccess('Order cancelled')
      setDetailOpen(false)
      clearDetail()
    } else toastError(result.error || 'Cancel failed')
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Purchase Orders"
          description="Buy catalog items from suppliers — prices feed product last/current purchase"
          actions={
            <Button
              type="button"
              variant="brand"
              onClick={openGenerate}
            >
              <Plus className="size-4" />
              Generate order
            </Button>
          }
        />
      </MotionHeader>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <MotionReveal delay={0.04}>
        <OrderFilters
          q={filters.q || ''}
          status={filters.status || ''}
          onSearchChange={(q) => updateFilters({ q })}
          onStatusChange={(status) => updateFilters({ status, page: 1 })}
        />
      </MotionReveal>

      <MotionReveal delay={0.08}>
        <OrderTable
          items={items}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(limit) => updateFilters({ limit })}
          onView={handleView}
          onHistory={handleHistory}
          onPrint={handlePrint}
        />
      </MotionReveal>

      <GenerateOrderDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        suppliers={supplierOptions}
        products={productOptions}
        loading={mutating}
        onSubmit={handleGenerate}
      />

      <OrderDetailPanel
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) clearDetail()
        }}
        order={selected}
        loading={mutating}
        onApprove={handleApprove}
        onCancel={handleCancel}
        onPrint={handlePrint}
      />

      <PurchaseHistoryList
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        history={history}
      />
    </div>
  )
}

export default PurchaseOrdersPage
