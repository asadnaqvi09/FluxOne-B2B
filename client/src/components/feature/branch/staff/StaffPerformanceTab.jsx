import { useEffect, useState, useMemo } from 'react'
import { Award, Settings, ShieldAlert, Star, Sliders, Pencil, Trash2 } from 'lucide-react'
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

export function StaffPerformanceTab({ designations = [] }) {
  const [activeSubTab, setActiveSubTab] = useState('roster') // 'roster' | 'scales'
  
  // Roster States
  const [roster, setRoster] = useState([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDesignation, setFilterDesignation] = useState('')
  const [rosterPage, setRosterPage] = useState(1)
  const [scalesPage, setScalesPage] = useState(1)

  // Scoring Modal States
  const [scoringEmployee, setScoringEmployee] = useState(null)
  const [scales, setScales] = useState([])
  const [scores, setScores] = useState({}) // scaleId -> points selection
  const [mutatingScore, setMutatingScore] = useState(false)

  // Scales CRUD States
  const [loadingScales, setLoadingScales] = useState(false)
  const [newScaleName, setNewScaleName] = useState('')
  const [newScalePoints, setNewScalePoints] = useState(50)
  const [editingScale, setEditingScale] = useState(null)
  const [deleteTargetScale, setDeleteTargetScale] = useState(null)

  const fetchRoster = async () => {
    setLoadingRoster(true)
    const res = await apiClient.get('/branch/performance/scores')
    setLoadingRoster(false)
    if (res.success) {
      setRoster(res.data || [])
    }
  }

  const fetchScales = async () => {
    setLoadingScales(true)
    const res = await apiClient.get('/branch/performance/scales')
    setLoadingScales(false)
    if (res.success) {
      setScales(res.data || [])
    }
  }

  useEffect(() => {
    void fetchRoster()
    void fetchScales()
  }, [])

  // Roster filters
  const filteredRoster = roster.filter((emp) => {
    if (filterDesignation && emp.designationId !== filterDesignation) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesName = String(emp.fullName || '').toLowerCase().includes(q)
      const matchesId = String(emp.staffId || '').toLowerCase().includes(q)
      if (!matchesName && !matchesId) return false
    }
    return true
  })

  // Open score modal
  const openScoringModal = (employee) => {
    setScoringEmployee(employee)
    const initialScores = {}
    scales.forEach((s) => {
      initialScores[s.id] = Math.round(s.maxPoints / 2) // default mid point
    })
    setScores(initialScores)
  }

  const handleScoreSliderChange = (scaleId, val) => {
    setScores((prev) => ({
      ...prev,
      [scaleId]: parseInt(val, 10),
    }))
  }

  const submitScores = async () => {
    setMutatingScore(true)
    let successCount = 0
    // Submit scores sequentially
    for (const scaleId of Object.keys(scores)) {
      const pts = scores[scaleId]
      const res = await apiClient.post('/branch/performance/scores', {
        staffId: scoringEmployee.staffId,
        scaleId,
        points: pts,
      })
      if (res.success) successCount++
    }
    setMutatingScore(false)
    if (successCount > 0) {
      toastSuccess('Performance scores recorded')
      setScoringEmployee(null)
      void fetchRoster()
    }
  }

  // Scales CRUD
  const handleAddScale = async (e) => {
    e.preventDefault()
    if (!newScaleName.trim() || !newScalePoints) return toastError('All fields required')

    const res = await apiClient.post('/branch/performance/scales', {
      name: newScaleName,
      maxPoints: newScalePoints,
    })
    if (res.success) {
      toastSuccess('Scoring scale added')
      setNewScaleName('')
      setNewScalePoints(50)
      void fetchScales()
    } else {
      toastError(res.error || 'Failed to add scale')
    }
  }

  const handleUpdateScale = async (e) => {
    e.preventDefault()
    if (!editingScale.name.trim() || !editingScale.maxPoints) return toastError('All fields required')

    const res = await apiClient.put(`/branch/performance/scales/${editingScale.id}`, {
      name: editingScale.name,
      maxPoints: editingScale.maxPoints,
    })
    if (res.success) {
      toastSuccess('Scoring scale updated')
      setEditingScale(null)
      void fetchScales()
    } else {
      toastError(res.error || 'Failed to update scale')
    }
  }

  const confirmDeleteScale = async () => {
    if (!deleteTargetScale) return
    setLoadingScales(true)
    const res = await apiClient.delete(`/branch/performance/scales/${deleteTargetScale.id}`)
    setLoadingScales(false)
    if (res.success) {
      toastSuccess('Scoring scale deleted')
      setDeleteTargetScale(null)
      void fetchScales()
    } else {
      toastError(res.error || 'Failed to delete scale')
    }
  }

  // Helper to color performance score badges
  const getRatingBadgeStyle = (rating) => {
    if (rating >= 75) {
      return 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-none font-bold rounded-lg px-2.5 py-1 text-sm'
    }
    if (rating >= 50) {
      return 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-none font-bold rounded-lg px-2.5 py-1 text-sm'
    }
    return 'bg-rose-50 text-rose-800 hover:bg-rose-100 border-none font-bold rounded-lg px-2.5 py-1 text-sm'
  }

  return (
    <div className="space-y-4">
      {/* Sub tabs */}
      <div className="flex gap-2 border-b border-border pb-3">
        <Button
          size="sm"
          variant={activeSubTab === 'roster' ? 'default' : 'outline'}
          onClick={() => setActiveSubTab('roster')}
          style={activeSubTab === 'roster' ? { backgroundColor: BRAND.purple } : {}}
          className={activeSubTab === 'roster' ? 'text-white' : ''}
        >
          Performance Roster
        </Button>
        <Button
          size="sm"
          variant={activeSubTab === 'scales' ? 'default' : 'outline'}
          onClick={() => setActiveSubTab('scales')}
          style={activeSubTab === 'scales' ? { backgroundColor: BRAND.purple } : {}}
          className={activeSubTab === 'scales' ? 'text-white' : ''}
        >
          <Settings className="mr-1 size-4" />
          Scoring Scales
        </Button>
      </div>

      {activeSubTab === 'roster' ? (
        <SurfaceCard
          title="Staff Scores & Performance Evaluation"
          actions={
            <span className="text-xs font-medium text-slate-400">
              {filteredRoster.length} records · {PAGE_SIZE} / page
            </span>
          }
        >
          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
            <div className="space-y-1.5">
              <Label>Search Employee</Label>
              <Input
                placeholder="Search by name or ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Filter Designation</Label>
              <NativeSelect value={filterDesignation} onChange={(e) => setFilterDesignation(e.target.value)}>
                <option value="">All Designations</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="text-slate-500 text-xs uppercase">
                <TableHead>Employee</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead className="text-center">Score rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingRoster ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-slate-400">Loading...</TableCell>
                </TableRow>
              ) : filteredRoster.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-slate-400">No records found</TableCell>
                </TableRow>
              ) : (
                filteredRoster
                  .slice((rosterPage - 1) * PAGE_SIZE, rosterPage * PAGE_SIZE)
                  .map((emp) => (
                    <TableRow key={emp.staffId}>
                      <TableCell className="font-semibold text-slate-900">{emp.fullName}</TableCell>
                      <TableCell className="text-slate-600">{emp.designation || '—'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getRatingBadgeStyle(emp.rating)}>
                          <Star className="size-3.5 fill-current mr-1" />
                          {emp.rating}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          style={{ backgroundColor: BRAND.purple }}
                          className="text-white text-xs h-8"
                          onClick={() => openScoringModal(emp)}
                        >
                          Score Employee
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>

          <TablePagination
            page={rosterPage}
            pageCount={Math.max(1, Math.ceil(filteredRoster.length / PAGE_SIZE))}
            totalItems={filteredRoster.length}
            onPageChange={setRosterPage}
          />
        </SurfaceCard>
      ) : (
        /* Scales configurations using Shadcn Table component */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SurfaceCard
              title="Configured Scoring Criteria"
              description="Standardized criteria weights used to score shifts"
              actions={
                <span className="text-xs font-medium text-slate-400">
                  {scales.length} records · {PAGE_SIZE} / page
                </span>
              }
            >
              <Table>
                <TableHeader>
                  <TableRow className="text-slate-500 text-xs uppercase">
                    <TableHead>Scale Name</TableHead>
                    <TableHead>Max Weights/Points</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingScales ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-slate-400">Loading...</TableCell>
                    </TableRow>
                  ) : scales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-slate-400">No scales configured</TableCell>
                    </TableRow>
                  ) : (
                    scales
                      .slice((scalesPage - 1) * PAGE_SIZE, scalesPage * PAGE_SIZE)
                      .map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-semibold text-slate-900">{s.name}</TableCell>
                          <TableCell className="text-slate-700 font-mono">{s.maxPoints} pts</TableCell>
                          <TableCell className="text-right space-x-3.5">
                            <button
                              type="button"
                              className="text-slate-500 hover:text-slate-800 transition-colors inline-block align-middle"
                              onClick={() => setEditingScale(s)}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="text-slate-500 hover:text-slate-800 transition-colors inline-block align-middle"
                              onClick={() => setDeleteTargetScale(s)}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>

              <TablePagination
                page={scalesPage}
                pageCount={Math.max(1, Math.ceil(scales.length / PAGE_SIZE))}
                totalItems={scales.length}
                onPageChange={setScalesPage}
              />
            </SurfaceCard>
          </div>

          <div>
            <SurfaceCard
              title={editingScale ? 'Edit Scoring Scale' : 'Add Scoring Scale'}
              description="Define max weights for evaluations"
            >
              {editingScale ? (
                <form className="space-y-4" onSubmit={handleUpdateScale}>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-scale-name">Criteria Name</Label>
                    <Input
                      id="edit-scale-name"
                      value={editingScale.name}
                      onChange={(e) => setEditingScale({ ...editingScale, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-scale-points">Maximum Score Points</Label>
                    <Input
                      id="edit-scale-points"
                      type="number"
                      value={editingScale.maxPoints}
                      onChange={(e) => setEditingScale({ ...editingScale, maxPoints: parseInt(e.target.value, 10) })}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="w-1/2" onClick={() => setEditingScale(null)}>Cancel</Button>
                    <Button type="submit" className="w-1/2 text-white" style={{ backgroundColor: BRAND.purple }}>Update</Button>
                  </div>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleAddScale}>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-scale-name">Criteria Name</Label>
                    <Input
                      id="add-scale-name"
                      placeholder="e.g. Communication points"
                      value={newScaleName}
                      onChange={(e) => setNewScaleName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-scale-points">Maximum Score Points</Label>
                    <Input
                      id="add-scale-points"
                      type="number"
                      placeholder="e.g. 50"
                      value={newScalePoints}
                      onChange={(e) => setNewScalePoints(parseInt(e.target.value, 10))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full text-white" style={{ backgroundColor: BRAND.purple }}>
                    Add Scale
                  </Button>
                </form>
              )}
            </SurfaceCard>
          </div>
        </div>
      )}

      {/* Scoring Modal Dialog */}
      <Dialog open={Boolean(scoringEmployee)} onOpenChange={(open) => { if (!open) setScoringEmployee(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Evaluate Performance: {scoringEmployee?.fullName}</DialogTitle>
            <DialogDescription>
              Assign scores based on bar/slider selections. Maximum points are defined by active scales.
            </DialogDescription>
          </DialogHeader>

          {scales.length === 0 ? (
            <p className="py-4 text-center text-slate-400">Please configure scoring scales first.</p>
          ) : (
            <div className="space-y-4 py-2">
              {scales.map((s) => {
                const currentVal = scores[s.id] || 0
                return (
                  <div key={s.id} className="space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{s.name}</span>
                      <span className="text-purple-700">{currentVal} / {s.maxPoints} pts</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={s.maxPoints}
                      value={currentVal}
                      onChange={(e) => handleScoreSliderChange(s.id, e.target.value)}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                )
              })}
            </div>
          )}

          <DialogFooter>
            <DialogCancelButton disabled={mutatingScore} className="w-full sm:w-auto" />
            <Button
              onClick={submitScores}
              disabled={mutatingScore || scales.length === 0}
              className="text-white w-full sm:w-auto"
              style={{ backgroundColor: BRAND.purple }}
            >
              {mutatingScore ? 'Saving…' : 'Record Scores'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTargetScale)}
        onOpenChange={(open) => { if (!open) setDeleteTargetScale(null) }}
        title="Delete scoring scale?"
        description="Delete this scoring scale? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteScale}
        loading={loadingScales}
      />
    </div>
  )
}
export default StaffPerformanceTab
