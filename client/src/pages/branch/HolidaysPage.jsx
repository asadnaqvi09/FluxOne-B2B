import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { StaffHolidaysTab } from '@/components/feature/branch/staff/StaffHolidaysTab'
import { Button } from '@/components/ui/button'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { useBranchRosterOptions } from '@/hooks/branch/useBranchRosterOptions'

export function HolidaysPage() {
  const { designations, staff, loading } = useBranchRosterOptions({
    designationLimit: 200,
    staffLimit: 500,
  })
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Operations"
          title="Holiday Management"
          description="Schedule branch holidays and automatically update attendance templates for selected employees."
          actions={
            <Button
              variant="brand"
              onClick={() => setCreateOpen(true)}
              className="rounded-xl"
            >
              <Plus className="mr-1.5 size-4" /> Add holiday
            </Button>
          }
        />
      </MotionHeader>

      <MotionReveal>
        {loading ? (
          <TableRowsSkeleton rows={5} />
        ) : (
          <StaffHolidaysTab
            designations={designations}
            staff={staff}
            createOpen={createOpen}
            onCreateOpenChange={setCreateOpen}
          />
        )}
      </MotionReveal>
    </div>
  )
}
