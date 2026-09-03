import { useState, useMemo } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
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
} from '@/components/ui/dialog'
import { BRAND } from '@/lib/constants'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  sanitizePhoneInput,
  validatePhone,
  validateEmail,
} from '@/lib/validation/formValidators'
import { getBranchesForTenant } from '@/data/adminBranchesMock'
import { useAuthSession } from '@/hooks/useAuthSession'
import {
  Plus,
  Search,
  MapPin,
  Mail,
  Phone,
  Edit2,
  Ban,
  CheckCircle,
  Users,
  Store,
  KeyRound,
} from 'lucide-react'

export function BranchesPage() {
  const { user } = useAuthSession()
  const tenantSlug = user?.tenantSlug || 'company-a'
  const [branches, setBranches] = useState(() => getBranchesForTenant(tenantSlug))
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'open' | 'blocked'
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [page, setPage] = useState(1)

  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false)
  const [targetBranch, setTargetBranch] = useState(null)

  // KPI Metrics calculations
  const stats = useMemo(() => {
    const total = branches.length
    const open = branches.filter((b) => b.status === 'open').length
    const blocked = branches.filter((b) => b.status === 'blocked').length
    const totalStaff = branches.reduce((acc, b) => acc + (Number(b.totalStaff) || 0), 0)
    const totalPos = branches.reduce((acc, b) => acc + (Number(b.activeTerminals) || 0), 0)
    return { total, open, blocked, totalStaff, totalPos }
  }, [branches])

  // Form State for Add / Edit Branch
  const [formData, setFormData] = useState({
    id: '',
    createdAt: '',
    name: '',
    location: '',
    image: '',
    managerName: '',
    managerEmail: '',
    managerContact: '',
    managerOtherContact: '',
    managerGender: 'Male',
    managerAddress: '',
  })

  // Open Add Modal
  function handleOpenAdd() {
    const nextId = `BR-00${branches.length + 1}`
    const now = new Date()
    const formattedDate = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

    setFormData({
      id: nextId,
      createdAt: formattedDate,
      name: '',
      location: '',
      image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=60',
      managerName: '',
      managerEmail: '',
      managerContact: '',
      managerOtherContact: '',
      managerGender: 'Male',
      managerAddress: '',
    })
    setEditingBranch(null)
    setAddDialogOpen(true)
  }

  // Open Edit Modal
  function handleOpenEdit(b) {
    setEditingBranch(b)
    setFormData({
      id: b.id,
      createdAt: b.createdAt || '2025-05-10 11:45 AM',
      name: b.name,
      location: b.location,
      image: b.image || '',
      managerName: b.manager?.name || '',
      managerEmail: b.manager?.email || '',
      managerContact: b.manager?.contact || '',
      managerOtherContact: b.manager?.otherContact || '',
      managerGender: b.manager?.gender || 'Male',
      managerAddress: b.manager?.address || '',
    })
    setAddDialogOpen(true)
  }

  // Open Prompt for Branch Block / Open Status
  function handlePromptToggleStatus(branch) {
    setTargetBranch(branch)
    setConfirmStatusOpen(true)
  }

  // Confirm Branch Block / Open Status
  function handleConfirmToggleStatus() {
    if (!targetBranch) return
    const isCurrentlyOpen = targetBranch.status === 'open'
    const nextStatus = isCurrentlyOpen ? 'blocked' : 'open'

    setBranches((prev) =>
      prev.map((b) => {
        if (b.id === targetBranch.id) {
          return {
            ...b,
            status: nextStatus,
            monthlySales: nextStatus === 'blocked' ? 'Rs. 0 (Blocked)' : 'Rs. 3.20 M',
          }
        }
        return b
      }),
    )

    toastSuccess(
      `Branch ${targetBranch.name} is now ${nextStatus === 'blocked' ? 'BLOCKED' : 'OPEN & Active'}`,
    )
    setTargetBranch(null)
    setConfirmStatusOpen(false)
  }

  // Submit Add / Edit Form
  function handleSubmitBranch(e) {
    e.preventDefault()
    if (!formData.name.trim() || !formData.location.trim()) {
      toastError('Please fill in Branch Name and Location')
      return
    }
    if (!formData.managerName.trim()) {
      toastError('Please fill in Branch Manager Name')
      return
    }

    // Email validation
    const emailErr = validateEmail(formData.managerEmail, { fieldName: 'Manager Email' })
    if (emailErr) {
      toastError(emailErr)
      return
    }

    // Phone validation
    const phoneErr = validatePhone(formData.managerContact, { fieldName: 'Manager Contact Phone' })
    if (phoneErr) {
      toastError(phoneErr)
      return
    }

    if (editingBranch) {
      // Update existing branch
      setBranches((prev) =>
        prev.map((b) => {
          if (b.id === editingBranch.id) {
            return {
              ...b,
              name: formData.name.trim(),
              location: formData.location.trim(),
              image: formData.image || b.image,
              manager: {
                ...b.manager,
                name: formData.managerName.trim(),
                email: formData.managerEmail.trim(),
                contact: formData.managerContact.trim(),
                otherContact: formData.managerOtherContact.trim(),
                gender: formData.managerGender,
                address: formData.managerAddress.trim(),
              },
            }
          }
          return b
        }),
      )
      toastSuccess(`Branch details updated for "${formData.name}"`)
    } else {
      // Create new branch
      const newId = `BR-00${branches.length + 1}`
      const newBranch = {
        id: newId,
        name: formData.name.trim(),
        location: formData.location.trim(),
        status: 'open',
        image:
          formData.image ||
          'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=60',
        totalStaff: 4,
        activeTerminals: 1,
        monthlySales: 'Rs. 0 (New)',
        createdAt: 'Just now',
        manager: {
          name: formData.managerName.trim(),
          email: formData.managerEmail.trim(),
          contact: formData.managerContact.trim(),
          otherContact: formData.managerOtherContact.trim(),
          gender: formData.managerGender,
          address: formData.managerAddress.trim(),
          image:
            formData.managerGender === 'Female'
              ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=60'
              : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60',
        },
      }
      setBranches((prev) => [newBranch, ...prev])
      toastSuccess(`Branch "${formData.name}" added successfully!`)
    }

    setAddDialogOpen(false)
  }

  const PAGE_SIZE = 8

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.manager?.name?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ? true : b.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [branches, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / PAGE_SIZE))

  const pagedBranches = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredBranches.slice(start, start + PAGE_SIZE)
  }, [filteredBranches, page])

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Network Infrastructure"
          title="Manage Branches"
          description="Consolidated branch network, branch manager assignments, locations & access statuses"
          actions={
            <Button
              type="button"
              onClick={handleOpenAdd}
              className="text-white shadow-xs cursor-pointer font-semibold"
              style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
            >
              <Plus className="mr-1.5 size-4" />
              Add New Branch
            </Button>
          }
        />
      </MotionHeader>

      {/* KPI Overview Summary Banner */}
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
              <p className="text-lg font-bold text-slate-900 leading-tight">{stats.total}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active & Open</p>
              <p className="text-lg font-bold text-emerald-700 leading-tight">{stats.open}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
              <Ban className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Blocked Outlets</p>
              <p className="text-lg font-bold text-slate-700 leading-tight">{stats.blocked}</p>
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
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Staff / POS</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">
                {stats.totalStaff} <span className="text-xs font-normal text-slate-400">/ {stats.totalPos} POS</span>
              </p>
            </div>
          </div>
        </div>
      </MotionReveal>

      {/* Filter & Search Bar */}
      <MotionReveal delay={0.06}>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
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

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold shrink-0">Status:</span>
            <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all')
                  setPage(1)
                }}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-purple-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({branches.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('open')
                  setPage(1)
                }}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'open'
                    ? 'bg-white text-purple-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Open ({branches.filter((b) => b.status === 'open').length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('blocked')
                  setPage(1)
                }}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'blocked'
                    ? 'bg-white text-purple-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Blocked ({branches.filter((b) => b.status === 'blocked').length})
              </button>
            </div>
          </div>
        </div>
      </MotionReveal>

      {/* List of branches Table */}
      <MotionReveal delay={0.09}>
        <SurfaceCard
          title="List of branches"
          description="Registered branch network, branch manager assignments, locations & access statuses"
          actions={
            <span className="text-xs font-medium text-slate-400">
              {filteredBranches.length} records · {PAGE_SIZE} / page
            </span>
          }
        >
          <div className="overflow-x-auto">
            <Table className="min-w-[56rem] text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs text-slate-500 uppercase">
                  <TableHead className="px-3 py-3 font-medium whitespace-nowrap min-w-[7.5rem]">Id</TableHead>
                  <TableHead className="px-3 py-3 font-medium whitespace-nowrap min-w-[5.5rem]">Branch Image</TableHead>
                  <TableHead className="px-3 py-3 font-medium whitespace-nowrap min-w-[13rem]">Branch Name</TableHead>
                  <TableHead className="px-3 py-3 font-medium whitespace-nowrap min-w-[11rem]">Location</TableHead>
                  <TableHead className="px-3 py-3 font-medium whitespace-nowrap min-w-[15rem]">Branch Manager details</TableHead>
                  <TableHead className="px-3 py-3 font-medium whitespace-nowrap min-w-[6.5rem]">Status</TableHead>
                  <TableHead className="px-3 py-3 text-right font-medium whitespace-nowrap min-w-[9.5rem]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No branches match the filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedBranches.map((b) => {
                    const isOpen = b.status === 'open'
                    return (
                      <TableRow key={b.id} className="hover:bg-slate-50/80">
                        <TableCell className="px-3 py-3 whitespace-nowrap">
                          <span className="inline-block whitespace-nowrap text-xs font-bold font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100 shadow-2xs tracking-wide">
                            {b.id}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap">
                          <img
                            src={b.image}
                            alt={b.name}
                            className="size-11 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                          />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">Est. {b.createdAt}</span>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs text-slate-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="size-3.5 text-slate-400 shrink-0" />
                            <span>{b.location}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={b.manager?.image}
                              alt={b.manager?.name}
                              className="size-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-900 text-xs truncate">{b.manager?.name}</p>
                                <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium shrink-0">
                                  {b.manager?.gender}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                <Mail className="size-3 text-slate-400 shrink-0" />
                                <span className="truncate">{b.manager?.email}</span>
                              </p>
                              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                                <Phone className="size-3 text-slate-400 shrink-0" />
                                <span className="whitespace-nowrap">{b.manager?.contact}</span>
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3 whitespace-nowrap">
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
                        <TableCell className="px-3 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(b)}
                              className="h-8 text-xs cursor-pointer border-purple-200 text-purple-900 hover:bg-purple-50"
                            >
                              <Edit2 className="mr-1 size-3.5" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handlePromptToggleStatus(b)}
                              className="h-8 text-xs font-semibold cursor-pointer text-white shadow-xs"
                              style={{ background: isOpen ? BRAND.deep : BRAND.purple }}
                            >
                              {isOpen ? (
                                <>
                                  <Ban className="mr-1 size-3.5" />
                                  Block
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-1 size-3.5" />
                                  Open
                                </>
                              )}
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

          <TablePagination
            page={page}
            pageCount={totalPages}
            onPageChange={setPage}
          />
        </SurfaceCard>
      </MotionReveal>

      {/* Add / Edit Branch Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? 'Edit Branch Details' : 'Add New Branch'}
            </DialogTitle>
            <DialogDescription>
              {editingBranch
                ? 'Update branch location, manager contacts and details.'
                : 'Register a new branch. The manager will automatically receive their login credentials via email.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitBranch} className="space-y-4 pt-2">
            {/* Branch Details Section */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-slate-100 pb-1">
                Branch Details
              </h5>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="branchId" className="text-xs">Branch ID</Label>
                  <Input
                    id="branchId"
                    value={formData.id}
                    disabled
                    className="bg-slate-50 font-bold text-purple-900"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="createdAt" className="text-xs">Created Date / Time</Label>
                  <Input
                    id="createdAt"
                    value={formData.createdAt}
                    disabled
                    className="bg-slate-50 text-slate-600 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="branchName" className="text-xs">Name of branch *</Label>
                  <Input
                    id="branchName"
                    placeholder="e.g. Abbottabad Supply Branch"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="branchLocation" className="text-xs">Location *</Label>
                  <Input
                    id="branchLocation"
                    placeholder="e.g. Mansehra Road, Abbottabad"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="branchImage" className="text-xs">Branch Image URL (Optional)</Label>
                  <Input
                    id="branchImage"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Set Branch Manager Section */}
            <div className="space-y-3 pt-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-slate-100 pb-1">
                Set Branch Manager
              </h5>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="mgrName" className="text-xs">Name of branch manager *</Label>
                  <Input
                    id="mgrName"
                    placeholder="e.g. Farhan Ali"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrEmail" className="text-xs">Email *</Label>
                  <Input
                    id="mgrEmail"
                    type="email"
                    placeholder="e.g. farhan.ali@fluxone.b2b"
                    value={formData.managerEmail}
                    onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrContact" className="text-xs">Contract number *</Label>
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
                  <Label htmlFor="mgrOtherContact" className="text-xs">Other contact number</Label>
                  <Input
                    id="mgrOtherContact"
                    placeholder="03217654321"
                    value={formData.managerOtherContact}
                    onChange={(e) =>
                      setFormData({ ...formData, managerOtherContact: sanitizePhoneInput(e.target.value) })
                    }
                    maxLength={13}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrGender" className="text-xs">Gender (Male / Female / Other)</Label>
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
                  <Label htmlFor="mgrAddress" className="text-xs">Address</Label>
                  <Input
                    id="mgrAddress"
                    placeholder="e.g. House 12, Sector C, Abbottabad"
                    value={formData.managerAddress}
                    onChange={(e) => setFormData({ ...formData, managerAddress: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-xs text-purple-900 flex items-start gap-2">
              <KeyRound className="size-4 shrink-0 text-purple-700 mt-0.5" />
              <span>
                New branch will create it and by email inform to branch manager login credentials &amp; online login details.
              </span>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white font-semibold"
                style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
              >
                {editingBranch ? 'Save Changes' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Branch Status Confirmation Modal */}
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
                  Are you sure you want to block <strong>&quot;{targetBranch?.name}&quot;</strong> ({targetBranch?.id})?
                  <br />
                  All POS terminals, cashier checkouts, and staff logins for this branch will immediately be disabled.
                </>
              ) : (
                <>
                  Are you sure you want to open and activate <strong>&quot;{targetBranch?.name}&quot;</strong> ({targetBranch?.id})?
                  <br />
                  This branch will be re-enabled and POS terminals will resume transaction processing.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmStatusOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmToggleStatus}
              className="text-white font-semibold cursor-pointer shadow-sm"
              style={{ background: targetBranch?.status === 'open' ? BRAND.deep : BRAND.purple }}
            >
              {targetBranch?.status === 'open' ? 'Yes, Block Branch' : 'Yes, Open Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BranchesPage
