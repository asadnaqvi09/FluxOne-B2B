import { useEffect, useRef } from 'react'
import { InventoryKpiCards } from '@/components/feature/dashboard/InventoryKpiCards'
import { StockAlertsTable } from '@/components/feature/dashboard/StockAlertsTable'
import { StockOutChart } from '@/components/feature/dashboard/StockOutChart'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { Button } from '@/components/ui/button'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useInventoryDashboard } from '@/hooks/useInventoryDashboard'
import { toastError } from '@/lib/toast'

export function DashboardPage() {
  const { user } = useAuthSession()
  const name = user?.name || user?.fullName || 'Inventory Manager'
  const {
    kpis,
    alerts,
    alertsPagination,
    stockOutPie,
    setAlertsPage,
    setAlertsPageSize,
    loading,
    alertsLoading,
    error,
    reload,
  } = useInventoryDashboard()

  const slowHint = useSlowLoadingHint(loading || alertsLoading)

  const lastErrorRef = useRef(null)
  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error
      toastError(error)
    }
    if (!error) lastErrorRef.current = null
  }, [error])

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          eyebrow="Inventory"
          title="Inventory Overview"
          description={`Hi ${name} — categories, stock alerts, and top stock-out movers.`}
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={reload}
              className="w-full sm:w-auto"
            >
              Refresh
            </Button>
          }
        />
      </MotionHeader>

      <SlowLoadingBanner show={slowHint} />

      <div className="space-y-5 sm:space-y-6">
        <MotionReveal delay={0.04}>
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase">
              Inventory overview KPIs
            </p>
            <InventoryKpiCards kpis={kpis} loading={loading} />
          </div>
        </MotionReveal>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2 xl:gap-6">
          <MotionReveal delay={0.08}>
            <StockAlertsTable
              items={alerts}
              loading={alertsLoading || loading}
              pagination={alertsPagination}
              onPageChange={setAlertsPage}
              onPageSizeChange={setAlertsPageSize}
            />
          </MotionReveal>
          <MotionReveal delay={0.1}>
            <StockOutChart items={stockOutPie} loading={loading} />
          </MotionReveal>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
