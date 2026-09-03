import { useEffect, useState, useMemo } from 'react'
import { Calendar as CalendarIcon, List, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'

const PAGE_SIZE = 8

export function StaffAttendanceTab({ designations = [], staff = [] }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  
  const [subTab, setSubTab] = useState('overview') // 'overview' | 'mark'
  const [viewMode, setViewMode] = useState('list') // 'list' | 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterLogDate, setFilterLogDate] = useState(new Date().toISOString().split('T')[0])
  const [filterDesignation, setFilterDesignation] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [localAttendance, setLocalAttendance] = useState({})
  const [logPage, setLogPage] = useState(1)

  const fetchLogs = async () => {
    setLoading(true)
    const res = await apiClient.get('/branch/attendance')
    setLoading(false)
    if (res.success) {
      setLogs(res.data || [])
    }
  }

  useEffect(() => {
    void fetchLogs()
  }, [])

  // Sync local marked attendance
  useEffect(() => {
    const nextAttendance = {}
    staff.forEach((member) => {
      const log = logs.find((l) => {
        const lDate = String(l.workDate || '').split('T')[0]
        return l.staffId === member.id && lDate === selectedDate
      })
      nextAttendance[member.id] = {
        status: log?.status || 'present',
        note: log?.note || '',
        isSaved: Boolean(log),
      }
    })
    setLocalAttendance(nextAttendance)
  }, [selectedDate, staff, logs])

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayIndex = getFirstDayOfMonth(year, month)

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const filteredLogs = logs.filter((log) => {
    const matchedStaff = staff.find((s) => s.id === log.staffId)
    if (!matchedStaff) return false
    if (filterDesignation && matchedStaff.designationId !== filterDesignation) return false
    const logDate = String(log.workDate || '').split('T')[0]
    if (filterLogDate && logDate !== filterLogDate) return false
    return true
  })

  const getLogsForDate = (dayNum) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    return logs.filter((log) => log.workDate.split('T')[0] === dateStr)
  }

  const handleStatusChange = (staffId, status) => {
    setLocalAttendance((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], status },
    }))
  }

  const handleNoteChange = (staffId, note) => {
    setLocalAttendance((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], note },
    }))
  }

  const handleSaveAttendance = async (staffId) => {
    const item = localAttendance[staffId]
    if (!item) return

    setMutating(true)
    const res = await apiClient.post('/branch/attendance', {
      staffId,
      workDate: selectedDate,
      status: item.status,
      note: item.note || undefined,
    })
    setMutating(false)

    if (res.success) {
      toastSuccess(item.isSaved ? 'Attendance updated' : 'Attendance saved')
      setLocalAttendance((prev) => ({
        ...prev,
        [staffId]: { ...prev[staffId], isSaved: true },
      }))
      void fetchLogs()
    } else {
      toastError(res.error || 'Failed to save attendance')
    }
  }

  const handleSaveAll = async () => {
    setMutating(true)
    let successCount = 0
    for (const staffId of Object.keys(localAttendance)) {
      const item = localAttendance[staffId]
      const res = await apiClient.post('/branch/attendance', {
        staffId,
        workDate: selectedDate,
        status: item.status,
        note: item.note || undefined,
      })
      if (res.success) successCount++
    }
    setMutating(false)
    if (successCount > 0) {
      toastSuccess(`Recorded ${successCount} attendance records`)
      setLocalAttendance((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((id) => {
          next[id] = { ...next[id], isSaved: true }
        })
        return next
      })
      void fetchLogs()
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present': return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      case 'absent': return 'bg-rose-50 text-rose-700 ring-rose-200'
      case 'late': return 'bg-amber-50 text-amber-700 ring-amber-200'
      case 'holiday': return 'bg-sky-50 text-sky-700 ring-sky-200'
      case 'leave': return 'bg-indigo-50 text-indigo-700 ring-indigo-200'
      default: return 'bg-slate-50 text-slate-700 ring-slate-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Sub tabs header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={subTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setSubTab('overview')}
            style={subTab === 'overview' ? { backgroundColor: BRAND.purple } : {}}
            className={subTab === 'overview' ? 'text-white' : ''}
          >
            Attendance Logs
          </Button>
          <Button
            size="sm"
            variant={subTab === 'mark' ? 'default' : 'outline'}
            onClick={() => setSubTab('mark')}
            style={subTab === 'mark' ? { backgroundColor: BRAND.purple } : {}}
            className={subTab === 'mark' ? 'text-white' : ''}
          >
            <CheckSquare className="mr-1.5 size-4" />
            Manual Attendance
          </Button>
        </div>

        {subTab === 'overview' && (
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              style={viewMode === 'list' ? { backgroundColor: BRAND.purple } : {}}
              className={viewMode === 'list' ? 'text-white' : ''}
            >
              <List className="mr-1 size-4" /> List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              style={viewMode === 'calendar' ? { backgroundColor: BRAND.purple } : {}}
              className={viewMode === 'calendar' ? 'text-white' : ''}
            >
              <CalendarIcon className="mr-1 size-4" /> Calendar
            </Button>
          </div>
        )}
      </div>

      {subTab === 'overview' ? (
        <>
          {viewMode === 'list' ? (
            <SurfaceCard
              title="Daily Roster Logs"
              actions={
                <span className="text-xs font-medium text-slate-400">
                  {filteredLogs.length} records · {PAGE_SIZE} / page
                </span>
              }
            >
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-lg">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="filter-log-date">Log Date</Label>
                    {filterLogDate && (
                      <button
                        type="button"
                        onClick={() => setFilterLogDate('')}
                        className="text-[11px] text-purple-700 hover:underline"
                      >
                        Show All Dates
                      </button>
                    )}
                  </div>
                  <Input
                    id="filter-log-date"
                    type="date"
                    value={filterLogDate}
                    onChange={(e) => setFilterLogDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-log-desig">Filter Designation</Label>
                  <NativeSelect
                    id="filter-log-desig"
                    value={filterDesignation}
                    onChange={(e) => setFilterDesignation(e.target.value)}
                    className="h-9"
                  >
                    <option value="">All Designations</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </NativeSelect>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[36rem] text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="px-3 py-2 font-medium">Employee</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Designation</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Date</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Status</TableHead>
                      <TableHead className="px-3 py-2 font-medium">Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="py-8 text-center text-slate-400">Loading...</TableCell></TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="py-8 text-center text-slate-400">No logs found for this date</TableCell></TableRow>
                    ) : (
                      filteredLogs
                        .slice((logPage - 1) * PAGE_SIZE, logPage * PAGE_SIZE)
                        .map((log) => {
                          const m = staff.find((s) => s.id === log.staffId)
                          const logDateFormatted = new Date(log.workDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          return (
                            <TableRow key={log.id} className="hover:bg-slate-50/50">
                              <TableCell className="px-3 py-2.5 font-semibold text-slate-900">{m?.fullName || 'Employee'}</TableCell>
                              <TableCell className="px-3 py-2.5 text-slate-600">{m?.designation || '—'}</TableCell>
                              <TableCell className="px-3 py-2.5 text-slate-600 font-mono text-xs">
                                {logDateFormatted}
                              </TableCell>
                              <TableCell className="px-3 py-2.5">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${getStatusBadge(log.status)}`}>
                                  {log.status}
                                </span>
                              </TableCell>
                              <TableCell className="px-3 py-2.5 text-slate-400 italic">{log.note || '—'}</TableCell>
                            </TableRow>
                          )
                        })
                    )}
                  </TableBody>
                </Table>
              </div>

              <TablePagination
                page={logPage}
                pageCount={Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))}
                totalItems={filteredLogs.length}
                onPageChange={setLogPage}
              />
            </SurfaceCard>
          ) : (
            <SurfaceCard
              title={`${monthsList[month]} ${year}`}
              actions={
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="size-8" onClick={prevMonth}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="size-8" onClick={nextMonth}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <div className="min-w-[40rem]">
                  <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: firstDayIndex }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-20 bg-slate-50/50 rounded-lg border border-dashed border-slate-100" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1
                      const dayLogs = getLogsForDate(dayNum)
                      const presents = dayLogs.filter((l) => l.status === 'present').length
                      const absents = dayLogs.filter((l) => l.status === 'absent').length
                      return (
                        <div key={`day-${dayNum}`} className="h-20 p-1 bg-white border border-border rounded-lg flex flex-col justify-between hover:bg-slate-50">
                          <span className="text-xs font-bold text-slate-700">{dayNum}</span>
                          {dayLogs.length > 0 ? (
                            <div className="text-[10px] space-y-0.5">
                              {presents > 0 && <div className="bg-emerald-50 text-emerald-800 px-1 rounded truncate text-left">P: {presents}</div>}
                              {absents > 0 && <div className="bg-rose-50 text-rose-800 px-1 rounded truncate text-left">A: {absents}</div>}
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-300 italic">No logs</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </SurfaceCard>
          )}
        </>
      ) : (
        <SurfaceCard
          title="Daily Attendance Registry"
          actions={
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-36 py-1 h-9"
              />
              <Button
                onClick={handleSaveAll}
                disabled={mutating || staff.length === 0}
                style={{ backgroundColor: BRAND.purple }}
                className="text-white"
              >
                Save All
              </Button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <Table className="min-w-[38rem] text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs text-slate-500 uppercase">
                  <TableHead className="px-3 py-2 font-medium">Employee</TableHead>
                  <TableHead className="px-3 py-2 font-medium">Designation</TableHead>
                  <TableHead className="px-3 py-2 font-medium">Mark Attendance</TableHead>
                  <TableHead className="px-3 py-2 font-medium">Shift Note</TableHead>
                  <TableHead className="px-3 py-2 text-right font-medium">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((m) => {
                  const local = localAttendance[m.id] || { status: 'present', note: '', isSaved: false }
                  return (
                    <TableRow key={m.id} className="hover:bg-slate-50/50">
                      <TableCell className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900">{m.fullName}</div>
                        <div className="text-xs text-slate-400">{m.email}</div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-slate-600">{m.designation || '—'}</TableCell>
                      <TableCell className="px-3 py-2.5">
                        <NativeSelect value={local.status} onChange={(e) => handleStatusChange(m.id, e.target.value)} className="w-32 py-1 h-8">
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="leave">Leave</option>
                          <option value="holiday">Holiday</option>
                        </NativeSelect>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Input
                          placeholder="e.g. Late by 10 mins"
                          value={local.note}
                          onChange={(e) => handleNoteChange(m.id, e.target.value)}
                          className="h-8 py-0.5 text-xs max-w-[160px]"
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant={local.isSaved ? 'outline' : 'default'}
                          style={local.isSaved ? {} : { backgroundColor: BRAND.purple }}
                          className={local.isSaved ? 'border-slate-300 text-slate-700 hover:bg-slate-50' : 'text-white'}
                          onClick={() => handleSaveAttendance(m.id)}
                          disabled={mutating}
                        >
                          {local.isSaved ? 'Update' : 'Save'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </SurfaceCard>
      )}
    </div>
  )
}
export default StaffAttendanceTab
