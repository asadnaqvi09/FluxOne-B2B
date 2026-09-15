import { useEffect, useState } from 'react'
import { Scale, Plus, Trash2, Edit3, Monitor, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  validateHardwareForm,
  validateItemScaleForm,
} from '@/lib/validation/branchForms'

const PAGE_SIZE = 8

const actionBtnClass =
  'cursor-pointer text-slate-500 transition-colors hover:text-slate-900 active:scale-95'

export function ResourcesPage() {
  const [activeTab, setActiveTab] = useState('hardware')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [hardwareList, setHardwareList] = useState([])
  const [scalesList, setScalesList] = useState([])
  const [hwPage, setHwPage] = useState(1)
  const [scalesPage, setScalesPage] = useState(1)
  const [filterHardware, setFilterHardware] = useState('')
  const [hwSearch, setHwSearch] = useState('')
  const [scaleSearch, setScaleSearch] = useState('')
  const debouncedHwSearch = useDebouncedValue(hwSearch, 300)
  const debouncedScaleSearch = useDebouncedValue(scaleSearch, 300)

  const [hardwareOpen, setHardwareOpen] = useState(false)
  const [hardwareMode, setHardwareMode] = useState('create')
  const [editingHardware, setEditingHardware] = useState(null)
  const [hName, setHName] = useState('')
  const [hCompany, setHCompany] = useState('')
  const [hId, setHId] = useState('')
  const [hType, setHType] = useState('')
  const [hStatus, setHStatus] = useState('New')
  const [hImageFile, setHImageFile] = useState(null)
  const [hExistingImageUrl, setHExistingImageUrl] = useState(null)
  const [formError, setFormError] = useState(null)

  const [scalesMode, setScalesMode] = useState('create')
  const [editingScale, setEditingScale] = useState(null)
  const [scaleName, setScaleName] = useState('')
  const [scaleError, setScaleError] = useState(null)
  const [deleteTargetHardware, setDeleteTargetHardware] = useState(null)
  const [deleteTargetScale, setDeleteTargetScale] = useState(null)

  async function loadHardware(type = filterHardware, q = debouncedHwSearch) {
    const params = {}
    if (type) params.type = type
    if (q?.trim()) params.q = q.trim()
    const res = await apiClient.get(endpoints.branch.resources.hardware.list, params)
    if (res.success) {
      setHardwareList(res.data || [])
    } else {
      toastError(res.error || 'Failed to load hardware')
    }
  }

  async function loadScales(q = debouncedScaleSearch) {
    const params = {}
    if (q?.trim()) params.q = q.trim()
    const res = await apiClient.get(endpoints.branch.resources.scales.list, params)
    if (res.success) {
      setScalesList(res.data || [])
    } else {
      toastError(res.error || 'Failed to load scales')
    }
  }

  useEffect(() => {
    setHwPage(1)
    setLoading(true)
    void loadHardware(filterHardware, debouncedHwSearch).finally(() => setLoading(false))
  }, [filterHardware, debouncedHwSearch])

  useEffect(() => {
    if (activeTab !== 'scales') return
    setScalesPage(1)
    setLoading(true)
    void loadScales(debouncedScaleSearch).finally(() => setLoading(false))
  }, [activeTab, debouncedScaleSearch])

  function handleOpenHardwareCreate() {
    setHardwareMode('create')
    setEditingHardware(null)
    setHName('')
    setHCompany('')
    setHId('')
    setHType('')
    setHStatus('New')
    setHImageFile(null)
    setHExistingImageUrl(null)
    setFormError(null)
    setHardwareOpen(true)
  }

  function handleOpenHardwareEdit(hw) {
    setHardwareMode('edit')
    setEditingHardware(hw)
    setHName(hw.name || '')
    setHCompany(hw.companyName || '')
    setHId(hw.code || hw.id)
    setHType(hw.type || '')
    setHStatus(hw.status || 'New')
    setHImageFile(null)
    setHExistingImageUrl(hw.image || hw.imageUrl || null)
    setFormError(null)
    setHardwareOpen(true)
  }

  async function handleSaveHardware(e) {
    e.preventDefault()
    const isCreate = hardwareMode === 'create'
    const validationError = validateHardwareForm(
      {
        code: hId,
        name: hName,
        companyName: hCompany,
        type: hType,
        status: hStatus,
      },
      { isCreate },
    )
    if (validationError) {
      setFormError(validationError)
      return toastError(validationError)
    }
    setFormError(null)

    const formData = new FormData()
    formData.append('name', hName.trim())
    formData.append('companyName', hCompany.trim())
    formData.append('type', hType)
    formData.append('status', hStatus)
    if (hImageFile instanceof File && hImageFile.size > 0) {
      formData.append('image', hImageFile)
    }

    setSaving(true)
    const res = isCreate
      ? await apiClient.post(endpoints.branch.resources.hardware.create, formData)
      : await apiClient.put(
          endpoints.branch.resources.hardware.update(editingHardware.id),
          formData,
        )
    setSaving(false)

    if (!res.success) {
      setFormError(res.error || 'Failed to save hardware')
      return toastError(res.error || 'Failed to save hardware')
    }

    const createdCode = res.data?.code
    toastSuccess(
      isCreate
        ? createdCode
          ? `Hardware added (${createdCode})`
          : 'Hardware added successfully'
        : 'Hardware updated successfully',
    )
    setHardwareOpen(false)
    void loadHardware(filterHardware, debouncedHwSearch)
  }

  function handleDeleteHardware(hw) {
    if (hw.assignedToStaffId || hw.assignedToName) {
      return toastError('Cannot delete hardware. It is currently assigned to a staff member.')
    }
    setDeleteTargetHardware(hw)
  }

  async function confirmDeleteHardware() {
    if (!deleteTargetHardware) return
    setSaving(true)
    const res = await apiClient.delete(
      endpoints.branch.resources.hardware.delete(deleteTargetHardware.id),
    )
    setSaving(false)
    if (!res.success) {
      return toastError(res.error || 'Failed to delete hardware')
    }
    toastSuccess('Hardware deleted successfully')
    setDeleteTargetHardware(null)
    void loadHardware(filterHardware, debouncedHwSearch)
  }

  function handleOpenScaleCreate() {
    setScalesMode('create')
    setEditingScale(null)
    setScaleName('')
    setScaleError(null)
  }

  function handleOpenScaleEdit(sc) {
    setScalesMode('edit')
    setEditingScale(sc)
    setScaleName(sc.name)
    setScaleError(null)
  }

  async function handleSaveScale(e) {
    e.preventDefault()
    const validationError = validateItemScaleForm({ name: scaleName })
    if (validationError) {
      setScaleError(validationError)
      return toastError(validationError)
    }
    setScaleError(null)

    setSaving(true)
    const res =
      scalesMode === 'create'
        ? await apiClient.post(endpoints.branch.resources.scales.create, {
            name: scaleName.trim(),
          })
        : await apiClient.put(endpoints.branch.resources.scales.update(editingScale.id), {
            name: scaleName.trim(),
          })
    setSaving(false)

    if (!res.success) {
      setScaleError(res.error || 'Failed to save scale')
      return toastError(res.error || 'Failed to save scale')
    }

    toastSuccess(scalesMode === 'create' ? 'Scale added successfully' : 'Scale updated successfully')
    handleOpenScaleCreate()
    void loadScales(debouncedScaleSearch)
  }

  function handleDeleteScale(sc) {
    setDeleteTargetScale(sc)
  }

  async function confirmDeleteScale() {
    if (!deleteTargetScale) return
    setSaving(true)
    const res = await apiClient.delete(
      endpoints.branch.resources.scales.delete(deleteTargetScale.id),
    )
    setSaving(false)
    if (!res.success) {
      return toastError(res.error || 'Failed to delete scale')
    }
    toastSuccess('Scale deleted successfully')
    setDeleteTargetScale(null)
    if (editingScale?.id === deleteTargetScale.id) handleOpenScaleCreate()
    void loadScales(debouncedScaleSearch)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-0.5'
      case 'Good':
        return 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-none px-2.5 py-0.5'
      case 'Used':
        return 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-none px-2.5 py-0.5'
      default:
        return 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-none px-2.5 py-0.5'
    }
  }

  const displayCode = (hw) => hw.code || hw.id

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Assets"
          title="Resources Management"
          description="Register and track POS hardware assets and configure product weighing scales."
          actions={
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button
                variant={activeTab === 'hardware' ? 'default' : 'outline'}
                onClick={() => setActiveTab('hardware')}
                style={activeTab === 'hardware' ? { backgroundColor: BRAND.purple } : {}}
                className={`cursor-pointer flex-1 sm:flex-none ${activeTab === 'hardware' ? 'text-white' : 'hover:border-slate-300'}`}
              >
                <Monitor className="mr-1.5 size-4" />
                Hardware
              </Button>
              <Button
                variant={activeTab === 'scales' ? 'default' : 'outline'}
                onClick={() => setActiveTab('scales')}
                style={activeTab === 'scales' ? { backgroundColor: BRAND.purple } : {}}
                className={`cursor-pointer flex-1 sm:flex-none ${activeTab === 'scales' ? 'text-white' : 'hover:border-slate-300'}`}
              >
                <Scale className="mr-1.5 size-4" />
                Items Scales
              </Button>
            </div>
          }
        />
      </MotionHeader>

      {activeTab === 'hardware' ? (
        <>
          <MotionReveal delay={0.02}>
            <SurfaceCard
              padding="compact"
              className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
            >
              <div className="grid w-full flex-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="hw-search">Search by Name / ID</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="hw-search"
                      value={hwSearch}
                      placeholder="Search hardware name or ID…"
                      className="pl-9"
                      onChange={(e) => setHwSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hw-filter">Filter by Hardware Type</Label>
                  <NativeSelect
                    id="hw-filter"
                    value={filterHardware}
                    onChange={(e) => setFilterHardware(e.target.value)}
                    className="cursor-pointer"
                  >
                    <option value="">All Hardware</option>
                    <option value="Computers">Computers</option>
                    <option value="Scanners">Scanners</option>
                    <option value="Printers">Printers</option>
                    <option value="Telephone">Telephone</option>
                    <option value="Other">Other</option>
                  </NativeSelect>
                </div>
              </div>

              <Button
                style={{ backgroundColor: BRAND.purple }}
                className="cursor-pointer text-white hover:opacity-90"
                onClick={handleOpenHardwareCreate}
              >
                <Plus className="size-4 mr-1.5" /> Add Hardware
              </Button>
            </SurfaceCard>
          </MotionReveal>

          <MotionReveal delay={0.04}>
            <SurfaceCard
              title="Hardware Assets Registry"
              actions={
                <span className="text-xs font-medium text-slate-400">
                  {hardwareList.length} records · {PAGE_SIZE} / page
                </span>
              }
            >
              {loading ? (
                <p className="py-8 text-center text-sm text-slate-400">Loading hardware…</p>
              ) : hardwareList.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No hardware assets found</p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {hardwareList
                      .slice((hwPage - 1) * PAGE_SIZE, hwPage * PAGE_SIZE)
                      .map((hw) => (
                        <article
                          key={hw.id}
                          className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                        >
                          <div className="flex items-start gap-3">
                            {hw.image ? (
                              <img
                                src={hw.image}
                                alt={hw.name}
                                className="size-12 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                                HW
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {hw.name}
                                  </p>
                                  <p className="font-mono text-[11px] text-slate-400">
                                    {displayCode(hw)}
                                  </p>
                                </div>
                                <Badge variant="outline" className={getStatusBadge(hw.status)}>
                                  {hw.status}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {hw.type} · {hw.companyName}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {hw.assignedToName || 'Unassigned'}
                              </p>
                              <div className="mt-3 flex justify-end gap-3">
                                <button
                                  type="button"
                                  className="cursor-pointer text-slate-500 transition-colors hover:text-slate-900"
                                  onClick={() => handleOpenHardwareEdit(hw)}
                                  aria-label="Edit hardware"
                                >
                                  <Edit3 className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  className="cursor-pointer text-slate-500 transition-colors hover:text-slate-900"
                                  onClick={() => handleDeleteHardware(hw)}
                                  aria-label="Delete hardware"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <Table className="min-w-[44rem] text-left text-sm">
                      <TableHeader>
                        <TableRow className="text-xs text-slate-500 uppercase">
                          <TableHead className="px-2 py-3">Device Image</TableHead>
                          <TableHead className="px-2 py-3">Hardware ID / Date</TableHead>
                          <TableHead className="px-2 py-3">Device Name / Type</TableHead>
                          <TableHead className="px-2 py-3">Brand/Company</TableHead>
                          <TableHead className="px-2 py-3 text-center">Status</TableHead>
                          <TableHead className="hidden px-2 py-3 text-center lg:table-cell">
                            Assignee
                          </TableHead>
                          <TableHead className="sticky right-0 z-[1] bg-white px-2 py-3 text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hardwareList
                          .slice((hwPage - 1) * PAGE_SIZE, hwPage * PAGE_SIZE)
                          .map((hw) => (
                            <TableRow key={hw.id} className="group">
                              <TableCell className="px-2 py-3">
                                {hw.image ? (
                                  <img
                                    src={hw.image}
                                    alt={hw.name}
                                    className="size-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                                    HW
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="px-2 py-3">
                                <div className="font-mono font-bold text-slate-900">
                                  {displayCode(hw)}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {hw.createdAt
                                    ? new Date(hw.createdAt).toLocaleDateString()
                                    : '—'}
                                </div>
                              </TableCell>
                              <TableCell className="px-2 py-3">
                                <div className="font-semibold text-slate-900">{hw.name}</div>
                                <div className="text-[10px] font-medium text-slate-400">
                                  {hw.type}
                                </div>
                              </TableCell>
                              <TableCell className="px-2 py-3 text-slate-600">
                                {hw.companyName}
                              </TableCell>
                              <TableCell className="px-2 py-3 text-center">
                                <Badge variant="outline" className={getStatusBadge(hw.status)}>
                                  {hw.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden px-2 py-3 text-center text-slate-600 lg:table-cell">
                                {hw.assignedToName ? (
                                  <Badge
                                    variant="secondary"
                                    className="rounded border-none bg-purple-50 font-semibold text-purple-700 hover:bg-purple-100"
                                  >
                                    {hw.assignedToName}
                                  </Badge>
                                ) : (
                                  <span className="text-xs italic text-slate-400">Unassigned</span>
                                )}
                              </TableCell>
                              <TableCell className="sticky right-0 z-[1] space-x-3.5 bg-white px-2 py-3 text-right group-hover:bg-slate-50/80">
                                <button
                                  type="button"
                                  className="inline-block cursor-pointer align-middle text-slate-500 transition-colors hover:text-slate-900"
                                  onClick={() => handleOpenHardwareEdit(hw)}
                                >
                                  <Edit3 className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  className="inline-block cursor-pointer align-middle text-slate-500 transition-colors hover:text-slate-900"
                                  onClick={() => handleDeleteHardware(hw)}
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              <TablePagination
                page={hwPage}
                pageCount={Math.max(1, Math.ceil(hardwareList.length / PAGE_SIZE))}
                totalItems={hardwareList.length}
                onPageChange={setHwPage}
              />
            </SurfaceCard>
          </MotionReveal>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <MotionReveal delay={0.02}>
              <SurfaceCard padding="compact">
                <div className="space-y-1.5">
                  <Label htmlFor="scale-search">Search by Name / ID</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="scale-search"
                      value={scaleSearch}
                      placeholder="Search scale name or ITM-001…"
                      className="pl-9"
                      onChange={(e) => setScaleSearch(e.target.value)}
                    />
                  </div>
                </div>
              </SurfaceCard>
            </MotionReveal>
            <MotionReveal delay={0.03}>
              <SurfaceCard
                title="Packaging Weighing Scales"
                actions={
                  <span className="text-xs font-medium text-slate-400">
                    {scalesList.length} records · {PAGE_SIZE} / page
                  </span>
                }
              >
                {loading ? (
                  <p className="py-8 text-center text-sm text-slate-400">Loading scales…</p>
                ) : scalesList.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No scales found</p>
                ) : (
                  <>
                    <div className="space-y-3 md:hidden">
                      {scalesList
                        .slice((scalesPage - 1) * PAGE_SIZE, scalesPage * PAGE_SIZE)
                        .map((sc) => (
                          <article
                            key={sc.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800">{sc.name}</p>
                              <p className="font-mono text-[11px] text-slate-400">
                                {sc.code || String(sc.id).slice(0, 8)}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {sc.createdAt
                                  ? new Date(sc.createdAt).toLocaleDateString()
                                  : '—'}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-3">
                              <button
                                type="button"
                                className="cursor-pointer text-slate-500 transition-colors hover:text-slate-900"
                                onClick={() => handleOpenScaleEdit(sc)}
                                aria-label="Edit scale"
                              >
                                <Edit3 className="size-4" />
                              </button>
                              <button
                                type="button"
                                className="cursor-pointer text-slate-500 transition-colors hover:text-slate-900"
                                onClick={() => handleDeleteScale(sc)}
                                aria-label="Delete scale"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </article>
                        ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <Table className="w-full text-left text-sm">
                        <TableHeader>
                          <TableRow className="text-xs text-slate-500 uppercase">
                            <TableHead className="px-2 py-3">Scale ID</TableHead>
                            <TableHead className="px-2 py-3">Created Date</TableHead>
                            <TableHead className="px-2 py-3">Scale unit</TableHead>
                            <TableHead className="px-2 py-3 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scalesList
                            .slice((scalesPage - 1) * PAGE_SIZE, scalesPage * PAGE_SIZE)
                            .map((sc) => (
                              <TableRow key={sc.id}>
                                <TableCell className="px-2 py-3 font-mono font-bold text-slate-900">
                                  {sc.code || String(sc.id).slice(0, 8)}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-slate-500">
                                  {sc.createdAt
                                    ? new Date(sc.createdAt).toLocaleDateString()
                                    : '—'}
                                </TableCell>
                                <TableCell className="px-2 py-3 font-semibold text-slate-800">
                                  {sc.name}
                                </TableCell>
                                <TableCell className="space-x-3.5 px-2 py-3 text-right">
                                  <button
                                    type="button"
                                    className="inline-block cursor-pointer align-middle text-slate-500 transition-colors hover:text-slate-900"
                                    onClick={() => handleOpenScaleEdit(sc)}
                                  >
                                    <Edit3 className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-block cursor-pointer align-middle text-slate-500 transition-colors hover:text-slate-900"
                                    onClick={() => handleDeleteScale(sc)}
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                <TablePagination
                  page={scalesPage}
                  pageCount={Math.max(1, Math.ceil(scalesList.length / PAGE_SIZE))}
                  totalItems={scalesList.length}
                  onPageChange={setScalesPage}
                />
              </SurfaceCard>
            </MotionReveal>
          </div>

          <div>
            <MotionReveal delay={0.04}>
              <SurfaceCard title={scalesMode === 'create' ? 'Add New Scale' : 'Edit Scale'}>
                <form className="space-y-4" onSubmit={handleSaveScale}>
                  <div className="space-y-1.5">
                    <Label htmlFor="scale-name">Scale Name</Label>
                    <Input
                      id="scale-name"
                      placeholder="e.g. kg, pound, Box, Litre"
                      value={scaleName}
                      onChange={(e) => setScaleName(e.target.value)}
                      required
                    />
                  </div>
                  {scaleError ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                      {scaleError}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    {scalesMode === 'edit' ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-1/2"
                        onClick={handleOpenScaleCreate}
                      >
                        Cancel
                      </Button>
                    ) : null}
                    <Button
                      type="submit"
                      disabled={saving}
                      className="w-full cursor-pointer text-white hover:opacity-90"
                      style={{ backgroundColor: BRAND.purple }}
                    >
                      {saving ? 'Saving…' : 'Save Scale'}
                    </Button>
                  </div>
                </form>
              </SurfaceCard>
            </MotionReveal>
          </div>
        </div>
      )}

      <Dialog open={hardwareOpen} onOpenChange={setHardwareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {hardwareMode === 'create' ? 'Add New Hardware' : 'Edit Hardware'}
            </DialogTitle>
            <DialogDescription>
              Register corporate computing devices, scanners, or barcode assets.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSaveHardware}>
            <div className="space-y-1.5">
              <Label htmlFor="hw-form-id">Hardware ID</Label>
              <Input
                id="hw-form-id"
                value={
                  hardwareMode === 'edit'
                    ? hId
                    : 'Auto-generated after save'
                }
                disabled
                readOnly
              />
              {hardwareMode === 'create' ? (
                <p className="text-xs text-slate-500">
                  ID is assigned automatically when the device is created.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hw-form-name">Name</Label>
              <Input
                id="hw-form-name"
                placeholder="e.g. Cashier Scanner"
                value={hName}
                onChange={(e) => setHName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="hw-form-company">Company / Brand</Label>
                <Input
                  id="hw-form-company"
                  placeholder="e.g. Dell, Honeywell"
                  value={hCompany}
                  onChange={(e) => setHCompany(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hw-form-type">Device Type</Label>
                <NativeSelect
                  id="hw-form-type"
                  value={hType}
                  onChange={(e) => setHType(e.target.value)}
                  required
                >
                  <option value="">Select device type</option>
                  <option value="Computers">Computers</option>
                  <option value="Scanners">Scanners</option>
                  <option value="Printers">Printers</option>
                  <option value="Telephone">Telephone</option>
                  <option value="Other">Other</option>
                </NativeSelect>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hw-form-status">Status</Label>
              <NativeSelect
                id="hw-form-status"
                value={hStatus}
                onChange={(e) => setHStatus(e.target.value)}
                required
              >
                <option value="New">New</option>
                <option value="Used">Used</option>
                <option value="Good">Good</option>
                <option value="Poor">Poor</option>
              </NativeSelect>
            </div>

            <ImageUploadField
              id="hw-form-image"
              label="Device Photo"
              optionalLabel="(optional)"
              value={hImageFile}
              existingImageUrl={hExistingImageUrl}
              onChange={setHImageFile}
            />

            {formError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                {formError}
              </p>
            ) : null}

            <DialogFooter>
              <DialogCancelButton disabled={saving} className="w-full sm:w-auto" />
              <Button
                type="submit"
                disabled={saving}
                className="w-full text-white sm:w-auto"
                style={{ backgroundColor: BRAND.purple }}
              >
                {saving ? 'Saving…' : 'Save Hardware'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTargetHardware)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetHardware(null)
        }}
        title="Delete hardware device?"
        description={`Delete hardware device "${deleteTargetHardware?.name || ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteHardware}
      />

      <ConfirmDialog
        open={Boolean(deleteTargetScale)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetScale(null)
        }}
        title="Delete scale?"
        description={`Delete weighing scale "${deleteTargetScale?.name || ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteScale}
      />
    </div>
  )
}

export default ResourcesPage
