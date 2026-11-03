import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { LeavesPanel } from '@/components/feature/branch/staff/LeavesPanel'
import { Button } from '@/components/ui/button'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { useBranchRosterOptions } from '@/hooks/branch/useBranchRosterOptions'

export function LeavesPage() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') === 'staff' ? 'staff' : 'mine'

  const { designations, staff, loading } = useBranchRosterOptions()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Operations"
          title="Leave Management"
          description="Submit and review leave requests for yourself and your team."
          actions={
            <Button variant="brand" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" /> Request leave
            </Button>
          }
        />
      </MotionHeader>

      <MotionReveal>
        {loading ? (
          <TableRowsSkeleton rows={5} />
        ) : (
          <LeavesPanel
            designations={designations}
            staff={staff}
            createOpen={createOpen}
            onCreateOpenChange={setCreateOpen}
            initialSubTab={tabParam}
          />
        )}
      </MotionReveal>
    </div>
  )
}
