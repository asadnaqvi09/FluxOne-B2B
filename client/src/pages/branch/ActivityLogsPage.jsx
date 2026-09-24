import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ActivityLogsFilters } from '@/components/feature/branch/logs/ActivityLogsFilters'
import { ActivityLogsList } from '@/components/feature/branch/logs/ActivityLogsList'
import { useActivityLogs } from '@/hooks/useActivityLogs'

export function ActivityLogsPage() {
  const { items, pagination, filters, loading, error, updateFilters, setPage } = useActivityLogs()

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Branch activity"
          title="Activity Logs"
          description="See who did what in this branch — POS cashier actions and branch changes."
        />
      </MotionHeader>

      <MotionReveal delay={0.02}>
        <ActivityLogsFilters filters={filters} onChange={updateFilters} />
      </MotionReveal>

      <MotionReveal delay={0.04}>
        <SurfaceCard
          title="Recent activity"
          description="Newest events first. Filter by date, source, or action."
        >
          <ActivityLogsList
            items={items}
            loading={loading}
            error={error}
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(limit) => updateFilters({ limit })}
          />
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}

export default ActivityLogsPage
