import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { StaffLeavesTab } from '@/components/feature/branch/staff/StaffLeavesTab'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

export function LeavesPage() {
  const [designations, setDesignations] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const [resDesig, resStaff] = await Promise.all([
      apiClient.get(endpoints.branch.designations.list, { limit: 100 }),
      apiClient.get(endpoints.branch.staff.list, { limit: 100, status: 'active' }),
    ])
    setLoading(false)

    if (resDesig.success) {
      setDesignations(resDesig.data.items || resDesig.data || [])
    }
    if (resStaff.success) {
      setStaff(resStaff.data.items || resStaff.data || [])
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Operations"
          title="Leave Management"
          description="Approve and record leave requests for single or multiple employees."
          actions={
            <Button
              type="button"
              variant="brand"
              onClick={() => setCreateOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="size-4" />
              Add Leaves
            </Button>
          }
        />
      </MotionHeader>

      <MotionReveal>
        {loading ? (
          <p className="py-8 text-center text-slate-400">Loading leave roster...</p>
        ) : (
          <StaffLeavesTab
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

export default LeavesPage
