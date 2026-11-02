import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { StaffAttendanceTab } from '@/components/feature/branch/staff/StaffAttendanceTab'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { useBranchRosterOptions } from '@/hooks/branch/useBranchRosterOptions'

export function AttendancePage() {
  const { designations, staff, loading } = useBranchRosterOptions()

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Operations"
          title="Attendance Management"
          description="View daily shift records, monthly aggregates, and record daily status."
        />
      </MotionHeader>

      <MotionReveal>
        {loading ? (
          <TableRowsSkeleton rows={5} />
        ) : (
          <StaffAttendanceTab designations={designations} staff={staff} />
        )}
      </MotionReveal>
    </div>
  )
}
