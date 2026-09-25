import { SearchStatusFilters } from '@/components/shared/SearchStatusFilters'

// Pending / cancelled removed — generate auto-accepts (approved)
const ORDER_STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'approved', label: 'Accepted' },
  { value: 'received', label: 'Received' },
]

// Reusable SearchStatusFilters — same layout as Supplier / Products
export function OrderFilters({
  q = '',
  status = '',
  onSearchChange,
  onStatusChange,
  className,
}) {
  return (
    <SearchStatusFilters
      className={className}
      q={q}
      status={status}
      searchPlaceholder="Search by order number or company…"
      statusOptions={ORDER_STATUS_OPTIONS}
      onSearchChange={onSearchChange}
      onStatusChange={onStatusChange}
    />
  )
}

export default OrderFilters
