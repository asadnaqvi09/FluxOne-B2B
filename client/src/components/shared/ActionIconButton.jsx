import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Reusable row action CTAs with hover scale / color feedback.
const ACTION_STYLES = {
  edit: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 hover:scale-110 active:scale-95',
  delete: 'text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:scale-110 active:scale-95',
}

const ACTION_ICONS = {
  edit: Pencil,
  delete: Trash2,
}

export function ActionIconButton({
  action = 'edit',
  label,
  onClick,
  className,
  iconClassName = 'size-4',
  disabled = false,
  type = 'button',
  ...props
}) {
  const Icon = ACTION_ICONS[action] || Pencil
  const tone = ACTION_STYLES[action] || ACTION_STYLES.edit

  return (
    <Button
      type={type}
      variant="ghost"
      size="icon"
      disabled={disabled}
      aria-label={label || (action === 'delete' ? 'Delete' : 'Edit')}
      title={label || (action === 'delete' ? 'Delete' : 'Edit')}
      onClick={onClick}
      className={cn('cursor-pointer', tone, className)}
      {...props}
    >
      <Icon className={cn(iconClassName, 'transition-transform duration-200')} />
    </Button>
  )
}

// Edit + Delete pair used in most data tables.
export function RowActionButtons({
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  className,
  iconClassName,
}) {
  return (
    <div className={cn('flex items-center justify-end gap-1', className)}>
      {onEdit ? (
        <ActionIconButton
          action="edit"
          label={editLabel}
          onClick={onEdit}
          iconClassName={iconClassName}
        />
      ) : null}
      {onDelete ? (
        <ActionIconButton
          action="delete"
          label={deleteLabel}
          onClick={onDelete}
          iconClassName={iconClassName}
        />
      ) : null}
    </div>
  )
}

export default ActionIconButton
