import { useMemo, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { BRAND } from '@/lib/constants'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  sanitizePhoneInput,
  validatePhone,
  validateEmail,
} from '@/lib/validation/formValidators'
import { useAdminBranches } from '@/hooks/useAdminBranches'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  Plus,
  Search,
  MapPin,
  Mail,
  Phone,
  Ban,
  CheckCircle,
  Users,
  Store,
  KeyRound,
  Loader2,
  Trash2,
  Eye,
  Pencil,
} from 'lucide-react'

const PAGE_SIZE = 8
const DEFAULT_BRANCH_IMAGE =
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=60'
const AVATAR_MALE =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
const AVATAR_FEMALE =
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'

function formatCreatedAt(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortId(id) {
  if (!id) return '—'
  const raw = String(id)
  return raw.length > 10 ? `${raw.slice(0, 8)}…` : raw
}

function managerAvatar(manager) {
  if (manager?.profileImage) return manager.profileImage
  return manager?.gender === 'Female' ? AVATAR_FEMALE : AVATAR_MALE
}

function credentialsToast(prefix, credentials) {
  if (!credentials) {
    toastSuccess(prefix)
    return
  }
  if (credentials.emailed) {
    toastSuccess(`${prefix} Login credentials emailed to ${credentials.email}.`)
    return
  }
  if (credentials.temporaryPassword) {
    toastSuccess(
      `${prefix} Email failed — use the key icon to resend. Temp password: ${credentials.temporaryPassword}`,
    )
    return
  }
  toastSuccess(
    `${prefix} Email failed — use the key icon on the row to reset & resend credentials.`,
  )
}

const emptyForm = {
  id: '',
  createdAt: '',
  name: '',
  location: '',
  imageFile: null,
  managerImageFile: null,
  managerName: '',
  managerEmail: '',
  managerContact: '',
  managerOtherContact: '',
  managerGender: 'Male',
  managerAddress: '',
}

export function BranchesPage() {
  const { user } = useAuthSession()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery.trim(), 300)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false)
  const [targetBranch, setTargetBranch] = useState(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  const {
    items,
    loading,
    mutating,
    error,
    createBranch,
    updateBranch,
    setBranchStatus,
    resetManagerPassword,
    deleteBranch,
  } = useAdminBranches({ q: debouncedQ, limit: 100 })

  const slowHint = useSlowLoadingHint(loading)

  const stats = useMemo(() => {
    const total = items.length
    const open = items.filter((b) => b.status === 'open').length
    const blocked = items.filter((b) => b.status === 'blocked').length
    const totalStaff = items.reduce((acc, b) => acc + (Number(b.totalStaff) || 0), 0)
    return { total, open, blocked, totalStaff }
  }, [items])

  // Search is server-side (debounced); status tabs stay client-side on the result set
  const filteredBranches = useMemo(() => {
    return items.filter((b) => (statusFilter === 'all' ? true : b.status === statusFilter))
  }, [items, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / PAGE_SIZE))

  const pagedBranches = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredBranches.slice(start, start + PAGE_SIZE)
  }, [filteredBranches, page])

  function handleOpenAdd() {
    setFormData({
      ...emptyForm,
      id: 'Assigned on save',
      createdAt: 'On save',
    })
    setEditingBranch(null)
    setAddDialogOpen(true)
  }

  function handleOpenEdit(b) {
    setEditingBranch(b)
    setFormData({
      id: b.id,
      createdAt: formatCreatedAt(b.createdAt),
      name: b.name || '',
      location: b.location || '',
      imageFile: null,
      managerImageFile: null,
      managerName: b.manager?.name || '',
      managerEmail: b.manager?.email || '',
      managerContact: b.manager?.contact || '',
      managerOtherContact: b.manager?.otherContact || '',
      managerGender: b.manager?.gender || 'Male',
      managerAddress: b.manager?.address || '',
    })
    setAddDialogOpen(true)
  }

  function handlePromptToggleStatus(branch) {
    setTargetBranch(branch)
    setConfirmStatusOpen(true)
  }

  async function handleConfirmToggleStatus() {
    if (!targetBranch) return
    const nextStatus = targetBranch.status === 'open' ? 'blocked' : 'open'
    const result = await setBranchStatus(targetBranch.id, nextStatus)
    if (!result.success) {
      toastError(result.error || 'Failed to update branch status')
      return
    }
    toastSuccess(
      `Branch ${targetBranch.name} is now ${nextStatus === 'blocked' ? 'BLOCKED' : 'OPEN & Active'}`,
    )
    setTargetBranch(null)
    setConfirmStatusOpen(false)
  }

  function handlePromptResetPassword(branch) {
    setResetTarget(branch)
    setResetDialogOpen(true)
  }

  async function handleConfirmResetPassword() {
    if (!resetTarget) return
    const result = await resetManagerPassword(resetTarget.id)
    if (!result.success) {
      toastError(result.error || 'Failed to reset password')
      return
    }
    credentialsToast(`Password reset for ${resetTarget.manager?.email || 'manager'}.`, result.data?.credentials)
    setResetTarget(null)
    setResetDialogOpen(false)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    const result = await deleteBranch(deleteTarget.id)
    if (!result.success) {
      toastError(result.error || 'Failed to delete branch')
      return
    }
    toastSuccess(`Branch "${deleteTarget.name}" deleted`)
    setDeleteTarget(null)
  }

  async function handleSubmitBranch(e) {
    e.preventDefault()
    if (!formData.name.trim() || !formData.location.trim()) {
      toastError('Please fill in Branch Name and Location')
      return
    }
    if (!formData.managerName.trim()) {
      toastError('Please fill in Branch Manager Name')
      return
    }

    const emailErr = validateEmail(formData.managerEmail, { fieldName: 'Manager Email' })
    if (emailErr) {
      toastError(emailErr)
      return
    }

    const phoneErr = validatePhone(formData.managerContact, { fieldName: 'Manager Contact Phone' })
    if (phoneErr) {
      toastError(phoneErr)
      return
    }

    if (formData.managerOtherContact.trim()) {
      const otherErr = validatePhone(formData.managerOtherContact, {
        fieldName: 'Other contact number',
        required: false,
      })
      if (otherErr) {
        toastError(otherErr)
        return
      }
    }

    const payload = {
      name: formData.name.trim(),
      location: formData.location.trim(),
      image: formData.imageFile || undefined,
      profileImage: formData.managerImageFile || undefined,
      managerName: formData.managerName.trim(),
      managerEmail: formData.managerEmail.trim(),
      managerContact: formData.managerContact.trim(),
      managerOtherContact: formData.managerOtherContact.trim() || undefined,
      managerGender: formData.managerGender,
      managerAddress: formData.managerAddress.trim() || undefined,
    }

    if (editingBranch) {
      const result = await updateBranch(editingBranch.id, payload)
      if (!result.success) {
        toastError(result.error || 'Failed to update branch')
        return
      }
      toastSuccess(`Branch details updated for "${formData.name}"`)
    } else {
      const result = await createBranch(payload)
      if (!result.success) {
        toastError(result.error || 'Failed to create branch')
        return
      }
      credentialsToast(`Branch "${formData.name}" created.`, result.data?.credentials)
    }

    setAddDialogOpen(false)
    setEditingBranch(null)
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow={user?.tenantName ? `${user.tenantName} · Network` : 'Network Infrastructure'}
          title="Manage Branches"
          description="Consolidated branch network, branch manager assignments, locations & access statuses"
          actions={
            <Button
              type="button"
              onClick={handleOpenAdd}
              disabled={loading}
              className="text-white shadow-xs cursor-pointer font-semibold"
              style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
            >
              <Plus className="mr-1.5 size-4" />
              Add New Branch
            </Button>
          }
        />
      </MotionHeader>

      <SlowLoadingBanner show={slowHint} />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <MotionReveal delay={0.03}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: BRAND.purple }}
            >
              <Store className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Outlets</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">{loading ? '—' : stats.total}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active & Open</p>
              <p className="text-lg font-bold text-emerald-700 leading-tight">{loading ? '—' : stats.open}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
              <Ban className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Blocked Outlets</p>
              <p className="text-lg font-bold text-slate-700 leading-tight">{loading ? '—' : stats.blocked}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: BRAND.deep }}
            >
              <Users className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Branch Staff</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">{loading ? '—' : stats.totalStaff}</p>
            </div>
          </div>
        </div>
      </MotionReveal>

      <MotionReveal delay={0.06}>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Branch Name, ID, Location, or Manager..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-xl border border-border bg-slate-50/70 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 outline-none focus:border-purple-300 focus:bg-white focus:ring-1 focus:ring-purple-300"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold shrink-0">Status:</span>
            <div className="flex max-w-full overflow-x-auto rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              {[
                { key: 'all', label: `All (${stats.total})` },
                { key: 'open', label: `Open (${stats.open})` },
                { key: 'blocked', label: `Blocked (${stats.blocked})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key)
                    setPage(1)
                  }}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.key
                      ? 'bg-white text-purple-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </MotionReveal>

      <MotionReveal delay={0.09}>
        <SurfaceCard
          title="List of branches"
          description="Registered branch network, branch manager assignments, locations & access statuses"
          actions={
            <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
              {filteredBranches.length} records · {PAGE_SIZE} / page
            </span>
          }
        >
          <div className="-mx-1 overflow-x-auto sm:mx-0">
            <Table className="min-w-[42rem] w-full text-left text-sm sm:min-w-[52rem]">
              <TableHeader>
                <TableRow className="text-xs text-slate-500 uppercase">
                  <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3">Id</TableHead>
                  <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3">Image</TableHead>
                  <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3 min-w-[10rem]">Branch</TableHead>
                  <TableHead className="hidden px-2 py-3 font-medium whitespace-nowrap sm:table-cell sm:px-3 min-w-[9rem]">
                    Location
                  </TableHead>
                  <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3 min-w-[12rem]">
                    Manager
                  </TableHead>
                  <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3">Status</TableHead>
                  <TableHead className="sticky right-0 z-[1] bg-white px-2 py-3 text-right font-medium whitespace-nowrap sm:px-3">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-xs text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Loading branches…
                      </span>
                    </TableCell>
                  </TableRow>
                ) : filteredBranches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No branches match the filter criteria. Add a branch to start the SoftFlux upward flow.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedBranches.map((b) => {
                    const isOpen = b.status === 'open'
                    const imageSrc = b.image || DEFAULT_BRANCH_IMAGE
                    return (
                      <TableRow key={b.id} className="group hover:bg-slate-50/80">
                        <TableCell className="px-2 py-3 whitespace-nowrap sm:px-3">
                          <span
                            title={b.id}
                            className="inline-block whitespace-nowrap text-[10px] sm:text-xs font-bold font-mono text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-100 shadow-2xs tracking-wide"
                          >
                            {shortId(b.id)}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-3 whitespace-nowrap sm:px-3">
                          <img
                            src={imageSrc}
                            alt={b.name}
                            className="size-9 sm:size-11 rounded-md object-cover border border-slate-200 shrink-0 shadow-2xs"
                          />
                        </TableCell>
                        <TableCell className="px-2 py-3 sm:px-3">
                          <p className="font-bold text-slate-900 text-xs sm:text-sm">{b.name}</p>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 whitespace-nowrap">
                            Est. {formatCreatedAt(b.createdAt)}
                          </span>
                          <p className="mt-1 flex items-start gap-1 text-[10px] text-slate-500 sm:hidden">
                            <MapPin className="mt-0.5 size-3 shrink-0 text-slate-400" />
                            <span className="line-clamp-2">{b.location || '—'}</span>
                          </p>
                        </TableCell>
                        <TableCell className="hidden px-2 py-3 text-xs text-slate-600 sm:table-cell sm:px-3">
                          <div className="flex items-start gap-1">
                            <MapPin className="mt-0.5 size-3.5 text-slate-400 shrink-0" />
                            <span className="line-clamp-2">{b.location || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-3 sm:px-3">
                          <div className="flex items-center gap-2 sm:gap-2.5">
                            <img
                              src={managerAvatar(b.manager)}
                              alt={b.manager?.name || 'Manager'}
                              className="size-8 sm:size-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-900 text-xs truncate">
                                  {b.manager?.name || '—'}
                                </p>
                                {b.manager?.gender ? (
                                  <span className="hidden text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium shrink-0 sm:inline">
                                    {b.manager.gender}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                <Mail className="size-3 text-slate-400 shrink-0" />
                                <span className="truncate">{b.manager?.email || '—'}</span>
                              </p>
                              <p className="hidden text-[11px] text-slate-400 truncate sm:flex items-center gap-1">
                                <Phone className="size-3 text-slate-400 shrink-0" />
                                <span className="whitespace-nowrap">{b.manager?.contact || '—'}</span>
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-3 whitespace-nowrap sm:px-3">
                          <Badge
                            variant="outline"
                            className={
                              isOpen
                                ? 'bg-purple-50 text-purple-900 border-purple-200 font-bold whitespace-nowrap'
                                : 'bg-slate-100 text-slate-700 border-slate-300 font-bold whitespace-nowrap'
                            }
                          >
                            {isOpen ? (
                              <CheckCircle className="mr-1 size-3 text-purple-700" />
                            ) : (
                              <Ban className="mr-1 size-3 text-slate-500" />
                            )}
                            {isOpen ? 'Open' : 'Block'}
                          </Badge>
                        </TableCell>
                        <TableCell className="sticky right-0 z-[1] bg-white px-1.5 py-3 text-right whitespace-nowrap sm:px-3 group-hover:bg-slate-50/80">
                          <div className="inline-flex items-center justify-end gap-0.5 sm:gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(b)}
                              disabled={mutating}
                              title="Edit branch"
                              aria-label={`Edit ${b.name}`}
                              className="size-8 text-purple-800 hover:bg-purple-50 hover:text-purple-950"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            {b.manager?.id && !b.manager?.credentialsEmailed ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePromptResetPassword(b)}
                                disabled={mutating}
                                title="Email failed — reset & resend credentials"
                                aria-label={`Resend credentials for ${b.name}`}
                                className="size-8 text-amber-700 hover:bg-amber-50 hover:text-amber-900"
                              >
                                <KeyRound className="size-4" />
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(b)}
                              disabled={mutating}
                              title="Delete branch"
                              aria-label={`Delete ${b.name}`}
                              className="size-8 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePromptToggleStatus(b)}
                              disabled={mutating}
                              title={isOpen ? 'Block branch' : 'Open branch'}
                              aria-label={isOpen ? `Block ${b.name}` : `Open ${b.name}`}
                              className={`size-8 ${
                                isOpen
                                  ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900'
                              }`}
                            >
                              {isOpen ? <Ban className="size-4" /> : <Eye className="size-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </SurfaceCard>
      </MotionReveal>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Edit Branch Details' : 'Add New Branch'}</DialogTitle>
            <DialogDescription>
              {editingBranch
                ? 'Update branch location and manager profile. Use the key icon on the row to reset password.'
                : 'Register a new branch. An auto-generated temporary password is emailed to the manager (or logged if SMTP is unset).'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitBranch} className="space-y-4 pt-2">
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-slate-100 pb-1">
                Branch Details
              </h5>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="branchId" className="text-xs">
                    Branch ID
                  </Label>
                  <Input
                    id="branchId"
                    value={formData.id}
                    disabled
                    title={editingBranch ? formData.id : undefined}
                    className="bg-slate-50 font-bold text-purple-900 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="createdAt" className="text-xs">
                    Created Date / Time
                  </Label>
                  <Input
                    id="createdAt"
                    value={formData.createdAt}
                    disabled
                    className="bg-slate-50 text-slate-600 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="branchName" className="text-xs">
                    Name of branch *
                  </Label>
                  <Input
                    id="branchName"
                    placeholder="e.g. Wah Cantt SoftFlux"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="branchLocation" className="text-xs">
                    Location *
                  </Label>
                  <Input
                    id="branchLocation"
                    placeholder="e.g. Main GT Road, Wah Cantt"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <ImageUploadField
                    id="branchImage"
                    label="Branch image"
                    optionalLabel="(optional)"
                    value={formData.imageFile}
                    existingImageUrl={editingBranch?.image || null}
                    onChange={(file) => setFormData({ ...formData, imageFile: file })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-slate-100 pb-1">
                Set Branch Manager
              </h5>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <ImageUploadField
                    id="managerProfileImage"
                    label="Branch manager image"
                    optionalLabel="(optional)"
                    value={formData.managerImageFile}
                    existingImageUrl={editingBranch?.manager?.profileImage || null}
                    onChange={(file) => setFormData({ ...formData, managerImageFile: file })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrName" className="text-xs">
                    Name of branch manager *
                  </Label>
                  <Input
                    id="mgrName"
                    placeholder="e.g. Farhan Ali"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrEmail" className="text-xs">
                    Email (login) *
                  </Label>
                  <Input
                    id="mgrEmail"
                    type="email"
                    placeholder="e.g. bm.wah@softwareflux.com"
                    value={formData.managerEmail}
                    onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrContact" className="text-xs">
                    Contact number *
                  </Label>
                  <Input
                    id="mgrContact"
                    placeholder="03001234567 or +923001234567"
                    value={formData.managerContact}
                    onChange={(e) =>
                      setFormData({ ...formData, managerContact: sanitizePhoneInput(e.target.value) })
                    }
                    maxLength={13}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrOtherContact" className="text-xs">
                    Other contact number
                  </Label>
                  <Input
                    id="mgrOtherContact"
                    placeholder="03217654321"
                    value={formData.managerOtherContact}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        managerOtherContact: sanitizePhoneInput(e.target.value),
                      })
                    }
                    maxLength={13}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrGender" className="text-xs">
                    Gender
                  </Label>
                  <NativeSelect
                    id="mgrGender"
                    value={formData.managerGender}
                    onChange={(e) => setFormData({ ...formData, managerGender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </NativeSelect>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrAddress" className="text-xs">
                    Address
                  </Label>
                  <Input
                    id="mgrAddress"
                    placeholder="e.g. House 12, Sector C, Wah Cantt"
                    value={formData.managerAddress}
                    onChange={(e) => setFormData({ ...formData, managerAddress: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {!editingBranch ? (
              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-xs text-purple-900 flex items-start gap-2">
                <KeyRound className="size-4 shrink-0 text-purple-700 mt-0.5" />
                <span>
                  Password is auto-generated and emailed to the manager. If the email succeeds, you are done. If
                  email fails, a key icon appears on the row so you can reset &amp; resend credentials.
                </span>
              </div>
            ) : null}

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)} disabled={mutating}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutating}
                className="text-white font-semibold"
                style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
              >
                {mutating ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Saving…
                  </>
                ) : editingBranch ? (
                  'Save Changes'
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmStatusOpen} onOpenChange={setConfirmStatusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-purple-950 flex items-center gap-2">
              {targetBranch?.status === 'open' ? (
                <>
                  <Ban className="size-5 text-purple-700" />
                  Block Branch Access
                </>
              ) : (
                <>
                  <CheckCircle className="size-5 text-purple-700" />
                  Open & Activate Branch
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1">
              {targetBranch?.status === 'open' ? (
                <>
                  Are you sure you want to block <strong>&quot;{targetBranch?.name}&quot;</strong>?
                  <br />
                  The branch manager login for this branch will be deactivated.
                </>
              ) : (
                <>
                  Are you sure you want to open and activate <strong>&quot;{targetBranch?.name}&quot;</strong>?
                  <br />
                  The branch manager login will be re-enabled.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmStatusOpen(false)}
              disabled={mutating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmToggleStatus}
              disabled={mutating}
              className="text-white font-semibold cursor-pointer shadow-sm"
              style={{ background: targetBranch?.status === 'open' ? BRAND.deep : BRAND.purple }}
            >
              {mutating ? 'Updating…' : targetBranch?.status === 'open' ? 'Yes, Block Branch' : 'Yes, Open Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-purple-700" />
              Reset manager password
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1">
              Credentials email did not go through for{' '}
              <strong>{resetTarget?.manager?.email || 'this branch manager'}</strong>. Generate a new temporary
              password and try sending again. Their previous password will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              disabled={mutating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmResetPassword}
              disabled={mutating}
              className="text-white font-semibold"
              style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
            >
              {mutating ? 'Resetting…' : 'Reset & send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete branch?"
        description={
          deleteTarget
            ? `Permanently remove "${deleteTarget.name}" and its branch manager login? Prefer Block if you only want to disable access. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        loading={mutating}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

export default BranchesPage
