import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'

// Shared employee multi-select used by Holiday / Leave create wizards (step 2).
export function StaffEmployeeChecklist({
  designations = [],
  staff = [],
  selectedIds = [],
  filterDesignation = '',
  onFilterChange,
  onToggle,
  onSelectAllFiltered,
  selectedLabel = 'Selected',
}) {
  const filteredStaff = staff.filter((member) => {
    if (filterDesignation && member.designationId !== filterDesignation) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Filter by Designation</Label>
        <NativeSelect value={filterDesignation} onChange={(e) => onFilterChange?.(e.target.value)}>
          <option value="">All Designations</option>
          {designations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
        <div className="mb-1 flex items-center justify-between border-b border-border pb-1">
          <span className="text-xs font-bold text-slate-500">
            {selectedLabel} ({selectedIds.length})
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onSelectAllFiltered?.(filteredStaff)}
            className="h-6 border border-slate-200 text-xs text-slate-600"
          >
            Select All
          </Button>
        </div>

        {filteredStaff.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">No employees in filter</p>
        ) : (
          filteredStaff.map((member) => (
            <label
              key={member.id}
              className="flex cursor-pointer items-center gap-2.5 rounded p-1.5 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(member.id)}
                onChange={() => onToggle?.(member.id)}
                className="size-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <div className="text-xs font-semibold text-slate-900">{member.fullName}</div>
                <div className="text-[10px] text-slate-400">
                  {member.designation || 'No designation'}
                </div>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  )
}

export default StaffEmployeeChecklist
