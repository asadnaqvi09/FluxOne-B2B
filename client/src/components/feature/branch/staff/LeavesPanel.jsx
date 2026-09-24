import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MyLeavesTab } from '@/components/feature/branch/staff/MyLeavesTab'
import { StaffLeavesTab } from '@/components/feature/branch/staff/StaffLeavesTab'
import { BRAND } from '@/lib/constants'

// Leaves module: My Leave (BM self) + Staff Leave (BM appoints employees)
export function LeavesPanel({
  designations = [],
  staff = [],
  createOpen = false,
  onCreateOpenChange,
  onSubTabChange,
  initialSubTab = 'mine',
}) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab) // 'mine' | 'staff'

  useEffect(() => {
    setActiveSubTab(initialSubTab)
  }, [initialSubTab])

  const switchSubTab = (next) => {
    if (next === activeSubTab) return
    // Close any open create dialog when switching contexts
    onCreateOpenChange?.(false)
    setActiveSubTab(next)
    onSubTabChange?.(next)
  }

  useEffect(() => {
    onSubTabChange?.(activeSubTab)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={activeSubTab === 'mine' ? 'default' : 'outline'}
          onClick={() => switchSubTab('mine')}
          style={activeSubTab === 'mine' ? { backgroundColor: BRAND.purple } : {}}
          className={activeSubTab === 'mine' ? 'text-white' : ''}
        >
          My Leave
        </Button>
        <Button
          size="sm"
          variant={activeSubTab === 'staff' ? 'default' : 'outline'}
          onClick={() => switchSubTab('staff')}
          style={activeSubTab === 'staff' ? { backgroundColor: BRAND.purple } : {}}
          className={activeSubTab === 'staff' ? 'text-white' : ''}
        >
          <Users className="mr-1 size-4" />
          Staff Leave
        </Button>
      </div>

      {activeSubTab === 'mine' ? (
        <MyLeavesTab createOpen={createOpen} onCreateOpenChange={onCreateOpenChange} />
      ) : (
        <StaffLeavesTab
          designations={designations}
          staff={staff}
          createOpen={createOpen}
          onCreateOpenChange={onCreateOpenChange}
        />
      )}
    </div>
  )
}

export default LeavesPanel
