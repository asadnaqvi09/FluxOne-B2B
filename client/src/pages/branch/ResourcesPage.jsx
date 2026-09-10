import { useEffect, useState } from 'react'
import { Scale, Plus, Trash2, Edit3, Monitor } from 'lucide-react'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogCancelButton } from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'

const PAGE_SIZE = 8

export function ResourcesPage() {
  const [activeTab, setActiveTab] = useState('hardware') // 'hardware' | 'scales'
  
  // Roster lists
  const [staff, setStaff] = useState([])
  const [hardwareList, setHardwareList] = useState([])
  const [scalesList, setScalesList] = useState([])
  const [hwPage, setHwPage] = useState(1)
  const [scalesPage, setScalesPage] = useState(1)

  // Hardware Filter
  const [filterHardware, setFilterHardware] = useState('')

  // Hardware Form Dialog
  const [hardwareOpen, setHardwareOpen] = useState(false)
  const [hardwareMode, setHardwareMode] = useState('create')
  const [editingHardware, setEditingHardware] = useState(null)
  
  // Hardware Fields
  const [hName, setHName] = useState('')
  const [hCompany, setHCompany] = useState('')
  const [hId, setHId] = useState('')
  const [hType, setHType] = useState('Computers') // Computers, Scanners, Printers, Telephone, Other
  const [hStatus, setHStatus] = useState('New') // New, Used, Good, Poor
  const [hImage, setHImage] = useState('')

  // Scales Form Dialog
  const [scalesOpen, setScalesOpen] = useState(false)
  const [scalesMode, setScalesMode] = useState('create')
  const [editingScale, setEditingScale] = useState(null)
  const [scaleName, setScaleName] = useState('')
  const [deleteTargetHardware, setDeleteTargetHardware] = useState(null)
  const [deleteTargetScale, setDeleteTargetScale] = useState(null)

  // Fetch staff list for checking assignments
  const loadStaff = async () => {
    const res = await apiClient.get('/branch/staff', { limit: 100 })
    if (res.success && res.data) {
      setStaff(res.data.items || res.data || [])
    }
  }

  // Load hardware and scales from LocalStorage (fallbacks seeded if empty)
  const loadResources = () => {
    const cachedHardware = localStorage.getItem('branch_hardware')
    if (cachedHardware) {
      setHardwareList(JSON.parse(cachedHardware))
    } else {
      const seedHardware = [
        { id: 'HW-001', name: 'Main POS Desktop', type: 'Computers', companyName: 'Dell', status: 'Good', createdAt: new Date().toISOString() },
        { id: 'HW-002', name: 'Barcode Scanner A', type: 'Scanners', companyName: 'Zebra', status: 'New', createdAt: new Date().toISOString() },
        { id: 'HW-003', name: 'Receipt Printer B', type: 'Printers', companyName: 'Epson', status: 'Used', createdAt: new Date().toISOString() },
      ]
      localStorage.setItem('branch_hardware', JSON.stringify(seedHardware))
      setHardwareList(seedHardware)
    }

    const cachedScales = localStorage.getItem('branch_scales')
    if (cachedScales) {
      setScalesList(JSON.parse(cachedScales))
    } else {
      const seedScales = [
        { id: 'SC-001', name: 'kg', createdAt: new Date().toISOString() },
        { id: 'SC-002', name: 'pound', createdAt: new Date().toISOString() },
        { id: 'SC-003', name: 'Piece', createdAt: new Date().toISOString() },
        { id: 'SC-004', name: 'Box', createdAt: new Date().toISOString() },
      ]
      localStorage.setItem('branch_scales', JSON.stringify(seedScales))
      setScalesList(seedScales)
    }
  }

  useEffect(() => {
    void loadStaff()
    loadResources()
  }, [])

  const saveHardwareToStorage = (list) => {
    localStorage.setItem('branch_hardware', JSON.stringify(list))
    setHardwareList(list)
  }

  const saveScalesToStorage = (list) => {
    localStorage.setItem('branch_scales', JSON.stringify(list))
    setScalesList(list)
  }

  // Hardware Actions
  const handleOpenHardwareCreate = () => {
    setHardwareMode('create')
    setEditingHardware(null)
    setHName('')
    setHCompany('')
    setHId(`HW-${Math.floor(100 + Math.random() * 900)}`)
    setHType('Computers')
    setHStatus('New')
    setHImage('')
    setHardwareOpen(true)
  }

  const handleOpenHardwareEdit = (hw) => {
    setHardwareMode('edit')
    setEditingHardware(hw)
    setHName(hw.name)
    setHCompany(hw.companyName)
    setHId(hw.id)
    setHType(hw.type || 'Computers')
    setHStatus(hw.status)
    setHImage(hw.image || '')
    setHardwareOpen(true)
  }

  const handleSaveHardware = (e) => {
    e.preventDefault()
    if (!hName.trim() || !hCompany.trim() || !hId.trim()) {
      return toastError('Hardware Name, ID, and Company Name are required')
    }

    if (hardwareMode === 'create') {
      const exists = hardwareList.some((h) => h.id === hId)
      if (exists) return toastError('A hardware device with this ID already exists')

      const newItem = {
        id: hId,
        name: hName.trim(),
        companyName: hCompany.trim(),
        type: hType,
        status: hStatus,
        image: hImage,
        createdAt: new Date().toISOString(),
      }
      saveHardwareToStorage([...hardwareList, newItem])
      toastSuccess('Hardware added successfully')
    } else {
      const updated = hardwareList.map((h) =>
        h.id === editingHardware.id
          ? { ...h, name: hName.trim(), companyName: hCompany.trim(), type: hType, status: hStatus, image: hImage }
          : h
      )
      saveHardwareToStorage(updated)
      toastSuccess('Hardware updated successfully')
    }
    setHardwareOpen(false)
  }

  const handleDeleteHardware = (hwId) => {
    const isAssigned = staff.some((s) => s.hardwareDeviceId === hwId)
    if (isAssigned) {
      return toastError('Cannot delete hardware. It is currently assigned to a staff member.')
    }
    const hw = hardwareList.find((h) => h.id === hwId)
    setDeleteTargetHardware(hw)
  }

  const confirmDeleteHardware = () => {
    if (!deleteTargetHardware) return
    const updated = hardwareList.filter((h) => h.id !== deleteTargetHardware.id)
    saveHardwareToStorage(updated)
    toastSuccess('Hardware deleted successfully')
    setDeleteTargetHardware(null)
  }

  // Scales Actions
  const handleOpenScaleCreate = () => {
    setScalesMode('create')
    setEditingScale(null)
    setScaleName('')
    setScalesOpen(true)
  }

  const handleOpenScaleEdit = (sc) => {
    setScalesMode('edit')
    setEditingScale(sc)
    setScaleName(sc.name)
    setScalesOpen(true)
  }

  const handleSaveScale = (e) => {
    e.preventDefault()
    if (!scaleName.trim()) return toastError('Scale name is required')

    if (scalesMode === 'create') {
      const exists = scalesList.some((s) => s.name.toLowerCase() === scaleName.trim().toLowerCase())
      if (exists) return toastError('Scale name already exists')

      const newItem = {
        id: `SC-${Math.floor(100 + Math.random() * 900)}`,
        name: scaleName.trim(),
        createdAt: new Date().toISOString(),
      }
      saveScalesToStorage([...scalesList, newItem])
      toastSuccess('Scale added successfully')
    } else {
      const updated = scalesList.map((s) =>
        s.id === editingScale.id ? { ...s, name: scaleName.trim() } : s
      )
      saveScalesToStorage(updated)
      toastSuccess('Scale updated successfully')
    }
    setScalesOpen(false)
  }

  const handleDeleteScale = (scId) => {
    const sc = scalesList.find((s) => s.id === scId)
    setDeleteTargetScale(sc)
  }

  const confirmDeleteScale = () => {
    if (!deleteTargetScale) return
    const updated = scalesList.filter((s) => s.id !== deleteTargetScale.id)
    saveScalesToStorage(updated)
    toastSuccess('Scale deleted successfully')
    setDeleteTargetScale(null)
  }

  const filteredHardware = hardwareList.filter((h) => {
    if (filterHardware && h.type !== filterHardware) return false
    return true
  })

  // Style badge mapping for hardware status
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
                className={`flex-1 sm:flex-none ${activeTab === 'hardware' ? 'text-white' : ''}`}
              >
                <Monitor className="mr-1.5 size-4" />
                Hardware
              </Button>
              <Button
                variant={activeTab === 'scales' ? 'default' : 'outline'}
                onClick={() => setActiveTab('scales')}
                style={activeTab === 'scales' ? { backgroundColor: BRAND.purple } : {}}
                className={`flex-1 sm:flex-none ${activeTab === 'scales' ? 'text-white' : ''}`}
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
          {/* Hardware filters */}
          <MotionReveal delay={0.02}>
            <SurfaceCard padding="compact" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full space-y-1.5 sm:w-56">
                <Label htmlFor="hw-filter">Filter by Hardware Type</Label>
                <NativeSelect
                  id="hw-filter"
                  value={filterHardware}
                  onChange={(e) => setFilterHardware(e.target.value)}
                >
                  <option value="">All Hardware</option>
                  <option value="Computers">Computers</option>
                  <option value="Scanners">Scanners</option>
                  <option value="Printers">Printers</option>
                  <option value="Telephone">Telephone</option>
                  <option value="Other">Other</option>
                </NativeSelect>
              </div>

              <Button
                style={{ backgroundColor: BRAND.purple }}
                className="text-white"
                onClick={handleOpenHardwareCreate}
              >
                <Plus className="size-4 mr-1.5" /> Add Hardware
              </Button>
            </SurfaceCard>
          </MotionReveal>

          {/* Hardware List using Shadcn Table component */}
          <MotionReveal delay={0.04}>
            <SurfaceCard
              title="Hardware Assets Registry"
              actions={
                <span className="text-xs font-medium text-slate-400">
                  {filteredHardware.length} records · {PAGE_SIZE} / page
                </span>
              }
            >
              {filteredHardware.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No hardware assets found</p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {filteredHardware
                      .slice((hwPage - 1) * PAGE_SIZE, hwPage * PAGE_SIZE)
                      .map((hw) => {
                        const assignedEmployee = staff.find((s) => s.hardwareDeviceId === hw.id)
                        return (
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
                                    <p className="font-mono text-[11px] text-slate-400">{hw.id}</p>
                                  </div>
                                  <Badge variant="outline" className={getStatusBadge(hw.status)}>
                                    {hw.status}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  {hw.type} · {hw.companyName}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {assignedEmployee ? assignedEmployee.fullName : 'Unassigned'}
                                </p>
                                <div className="mt-3 flex justify-end gap-3">
                                  <button
                                    type="button"
                                    className="text-slate-500 transition-colors hover:text-slate-800"
                                    onClick={() => handleOpenHardwareEdit(hw)}
                                    aria-label="Edit hardware"
                                  >
                                    <Edit3 className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="text-slate-500 transition-colors hover:text-slate-800"
                                    onClick={() => handleDeleteHardware(hw.id)}
                                    aria-label="Delete hardware"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        )
                      })}
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
                        {filteredHardware
                          .slice((hwPage - 1) * PAGE_SIZE, hwPage * PAGE_SIZE)
                          .map((hw) => {
                            const assignedEmployee = staff.find((s) => s.hardwareDeviceId === hw.id)
                            return (
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
                                  <div className="font-mono font-bold text-slate-900">{hw.id}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {new Date(hw.createdAt).toLocaleDateString()}
                                  </div>
                                </TableCell>
                                <TableCell className="px-2 py-3">
                                  <div className="font-semibold text-slate-900">{hw.name}</div>
                                  <div className="text-[10px] font-medium text-slate-400">{hw.type}</div>
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
                                  {assignedEmployee ? (
                                    <Badge
                                      variant="secondary"
                                      className="rounded border-none bg-purple-50 font-semibold text-purple-700 hover:bg-purple-100"
                                    >
                                      {assignedEmployee.fullName}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">Unassigned</span>
                                  )}
                                </TableCell>
                                <TableCell className="sticky right-0 z-[1] space-x-3.5 bg-white px-2 py-3 text-right group-hover:bg-slate-50/80">
                                  <button
                                    type="button"
                                    className="inline-block align-middle text-slate-500 transition-colors hover:text-slate-800"
                                    onClick={() => handleOpenHardwareEdit(hw)}
                                  >
                                    <Edit3 className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-block align-middle text-slate-500 transition-colors hover:text-slate-800"
                                    onClick={() => handleDeleteHardware(hw.id)}
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              <TablePagination
                page={hwPage}
                pageCount={Math.max(1, Math.ceil(filteredHardware.length / PAGE_SIZE))}
                totalItems={filteredHardware.length}
                onPageChange={setHwPage}
              />
            </SurfaceCard>
          </MotionReveal>
        </>
      ) : (
        // Scales Tab using Shadcn Table component
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MotionReveal delay={0.02}>
              <SurfaceCard
                title="Packaging Weighing Scales"
                actions={
                  <span className="text-xs font-medium text-slate-400">
                    {scalesList.length} records · {PAGE_SIZE} / page
                  </span>
                }
              >
                {scalesList.length === 0 ? (
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
                              <p className="font-mono text-[11px] text-slate-400">{sc.id}</p>
                              <p className="text-[11px] text-slate-400">
                                {new Date(sc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-3">
                              <button
                                type="button"
                                className="text-slate-500 transition-colors hover:text-slate-800"
                                onClick={() => handleOpenScaleEdit(sc)}
                                aria-label="Edit scale"
                              >
                                <Edit3 className="size-4" />
                              </button>
                              <button
                                type="button"
                                className="text-slate-500 transition-colors hover:text-slate-800"
                                onClick={() => handleDeleteScale(sc.id)}
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
                                  {sc.id}
                                </TableCell>
                                <TableCell className="px-2 py-3 text-slate-500">
                                  {new Date(sc.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="px-2 py-3 font-semibold text-slate-800">
                                  {sc.name}
                                </TableCell>
                                <TableCell className="space-x-3.5 px-2 py-3 text-right">
                                  <button
                                    type="button"
                                    className="inline-block align-middle text-slate-500 transition-colors hover:text-slate-800"
                                    onClick={() => handleOpenScaleEdit(sc)}
                                  >
                                    <Edit3 className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-block align-middle text-slate-500 transition-colors hover:text-slate-800"
                                    onClick={() => handleDeleteScale(sc.id)}
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
                  <div className="flex gap-2">
                    {scalesMode === 'edit' && (
                      <Button variant="outline" className="w-1/2" onClick={() => setScalesOpen(false)}>Cancel</Button>
                    )}
                    <Button type="submit" className="w-full text-white" style={{ backgroundColor: BRAND.purple }}>
                      Save Scale
                    </Button>
                  </div>
                </form>
              </SurfaceCard>
            </MotionReveal>
          </div>
        </div>
      )}

      {/* Hardware Form Dialog */}
      <Dialog open={hardwareOpen} onOpenChange={setHardwareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{hardwareMode === 'create' ? 'Add New Hardware' : 'Edit Hardware'}</DialogTitle>
            <DialogDescription>Register corporate computing devices, scanners, or barcode assets.</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSaveHardware}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="hw-form-id">Hardware ID</Label>
                <Input
                  id="hw-form-id"
                  value={hId}
                  onChange={(e) => setHId(e.target.value)}
                  disabled={hardwareMode === 'edit'}
                  required
                />
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
                >
                  <option value="Computers">Computers</option>
                  <option value="Scanners">Scanners</option>
                  <option value="Printers">Printers</option>
                  <option value="Telephone">Telephone</option>
                  <option value="Other">Other</option>
                </NativeSelect>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="hw-form-status">Status</Label>
                <NativeSelect
                  id="hw-form-status"
                  value={hStatus}
                  onChange={(e) => setHStatus(e.target.value)}
                >
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                  <option value="Good">Good</option>
                  <option value="Poor">Poor</option>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hw-form-image">Image URL (Optional)</Label>
                <Input
                  id="hw-form-image"
                  placeholder="http://example.com/device.jpg"
                  value={hImage}
                  onChange={(e) => setHImage(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogCancelButton className="w-full sm:w-auto" />
              <Button
                type="submit"
                className="text-white w-full sm:w-auto"
                style={{ backgroundColor: BRAND.purple }}
              >
                Save Hardware
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTargetHardware)}
        onOpenChange={(open) => { if (!open) setDeleteTargetHardware(null) }}
        title="Delete hardware device?"
        description={`Delete hardware device "${deleteTargetHardware?.name || ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteHardware}
      />

      <ConfirmDialog
        open={Boolean(deleteTargetScale)}
        onOpenChange={(open) => { if (!open) setDeleteTargetScale(null) }}
        title="Delete scale?"
        description={`Delete weighing scale "${deleteTargetScale?.name || ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteScale}
      />
    </div>
  )
}
export default ResourcesPage
