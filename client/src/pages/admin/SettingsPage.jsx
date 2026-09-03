import { useState, useMemo } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { getSystemsForTenant } from '@/data/adminSettingsMock'
import { useAuthSession } from '@/hooks/useAuthSession'
import {
  KeyRound,
  Shield,
  Monitor,
  Ban,
  CheckCircle2,
  Cpu,
  Lock,
  Eye,
  EyeOff,
  Clock,
  ShieldCheck,
  Search,
} from 'lucide-react'

export function SettingsPage() {
  const { user } = useAuthSession()
  const tenantSlug = user?.tenantSlug || 'company-a'
  const [activeTab, setActiveTab] = useState('security') // 'security' | 'systems'

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)

  // System Access State
  const [systems, setSystems] = useState(() => getSystemsForTenant(tenantSlug))
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'blocked'
  const [page, setPage] = useState(1)
  const pageSize = 6

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [targetSystem, setTargetSystem] = useState(null)

  // Submit Password Change
  function handleChangePassword(e) {
    e.preventDefault()
    if (!currentPassword) {
      toastError('Please enter your current password')
      return
    }
    if (newPassword.length < 6) {
      toastError('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toastError('New password and confirmation do not match')
      return
    }

    toastSuccess('Password updated successfully! All other sessions verified.')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  // Open confirmation modal for block / unblock
  function handlePromptBlockSystem(sys) {
    setTargetSystem(sys)
    setConfirmDialogOpen(true)
  }

  // Confirm Block / Unblock action
  function handleConfirmToggleBlock() {
    if (!targetSystem) return
    const isCurrentlyActive = targetSystem.status === 'active'
    const nextStatus = isCurrentlyActive ? 'blocked' : 'active'

    setSystems((prev) =>
      prev.map((s) => (s.id === targetSystem.id ? { ...s, status: nextStatus } : s)),
    )

    toastSuccess(
      `${targetSystem.deviceName} is now ${
        nextStatus === 'blocked' ? 'BLOCKED from accessing the system' : 'ACTIVE & Authorized'
      }`,
    )

    setTargetSystem(null)
    setConfirmDialogOpen(false)
  }

  const activeCount = systems.filter((s) => s.status === 'active').length
  const blockedCount = systems.filter((s) => s.status === 'blocked').length

  const filteredSystems = useMemo(() => {
    return systems.filter((sys) => {
      const matchesStatus = statusFilter === 'all' || sys.status === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        sys.deviceName.toLowerCase().includes(q) ||
        sys.branch.toLowerCase().includes(q) ||
        sys.userName.toLowerCase().includes(q) ||
        sys.hardwareSignature.toLowerCase().includes(q) ||
        sys.ipAddress.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [systems, statusFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredSystems.length / pageSize))
  const paginatedSystems = filteredSystems.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="System Configuration & Security"
          title="Admin Settings"
          description="Security testing, administrator credential updates, and hardware signature system access controls"
        />
      </MotionHeader>

      {/* Navigation Tabs */}
      <MotionReveal delay={0.05}>
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'security'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="size-4" />
            Security & Password Change
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('systems')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'systems'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="size-4" />
            All System Access ({systems.length})
          </button>
        </div>
      </MotionReveal>

      {/* TAB 1: SECURITY & PASSWORD CHANGE */}
      {activeTab === 'security' && (
        <MotionReveal delay={0.1}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            {/* Change Password Form */}
            <div className="lg:col-span-7">
              <SurfaceCard className="p-6">
                <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: BRAND.purple }}
                  >
                    <Lock className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Update Administrator Password
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ensure your account uses a long, unique password
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Current Password
                    </Label>
                    <Input
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-10 text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Confirm New Password
                    </Label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full text-white font-semibold cursor-pointer shadow-sm"
                      style={{ background: BRAND.purple }}
                    >
                      Update Password
                    </Button>
                  </div>
                </form>
              </SurfaceCard>
            </div>

            {/* Quick Security Status Side Panel */}
            <div className="lg:col-span-5 space-y-4">
              <SurfaceCard className="p-5">
                <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-purple-700" />
                  Security Protocols
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-900">
                        Two-Factor Authentication
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Email OTP verification for new terminals
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTwoFactorEnabled(!twoFactorEnabled)
                        toastSuccess(
                          `2FA ${!twoFactorEnabled ? 'Enabled' : 'Disabled'}`,
                        )
                      }}
                      className={`h-7 text-xs font-bold ${
                        twoFactorEnabled
                          ? 'bg-purple-50 text-purple-900 border-purple-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-900">
                        Session Timeout Auto-Lock
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Lock POS after 15 minutes of idle time
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                      15 mins
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-900">
                        Hardware Signature Binding
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Only verified MAC & UUID devices allowed
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                      Enforced
                    </Badge>
                  </div>
                </div>
              </SurfaceCard>
            </div>
          </div>
        </MotionReveal>
      )}

      {/* TAB 2: ALL SYSTEM ACCESS (STANDARD DESIGN SYSTEM TABLE) */}
      {activeTab === 'systems' && (
        <MotionReveal delay={0.1}>
          <div className="space-y-5">
            {/* KPI Overview Summary Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: BRAND.purple }}
                >
                  <Monitor className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Registered Systems</p>
                  <p className="text-lg font-bold text-slate-900 leading-tight">{systems.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active & Authorized</p>
                  <p className="text-lg font-bold text-emerald-700 leading-tight">{activeCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                  <Ban className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Blocked Systems</p>
                  <p className="text-lg font-bold text-slate-700 leading-tight">{blockedCount}</p>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Device Name, UUID, Branch, or User..."
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
                    All ({systems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('active')
                      setPage(1)
                    }}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === 'active'
                        ? 'bg-white text-purple-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Active ({activeCount})
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
                    Blocked ({blockedCount})
                  </button>
                </div>
              </div>
            </div>

            {/* List of System Access Terminals Table in SurfaceCard */}
            <SurfaceCard
              title="List of System Access Terminals"
              description="Hardware signature access, MAC/IP bindings & authorization statuses"
              actions={
                <span className="text-xs font-medium text-slate-400">
                  {filteredSystems.length} records · {pageSize} / page
                </span>
              }
            >
              <div className="overflow-x-auto">
                <Table className="w-full text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="px-4 py-3 font-medium">Device & Branch</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Hardware Signature & Network</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Assigned User</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Status & Activity</TableHead>
                      <TableHead className="px-4 py-3 text-right font-medium">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSystems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-xs text-slate-400">
                          No registered systems match the filter criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedSystems.map((sys) => {
                        const isActive = sys.status === 'active'
                        return (
                          <TableRow key={sys.id} className="hover:bg-slate-50/70 transition-colors">
                            <TableCell className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-white ${
                                    isActive ? 'bg-purple-900' : 'bg-rose-600'
                                  }`}
                                >
                                  <Cpu className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-xs text-slate-900 leading-tight">{sys.deviceName}</p>
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Branch: {sys.branch}</p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="px-4 py-3.5">
                              <div>
                                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-100 whitespace-nowrap inline-block tracking-wide">
                                  {sys.hardwareSignature}
                                </span>
                                <p className="font-mono text-[11px] text-slate-500 mt-1">
                                  IP: {sys.ipAddress} · MAC: {sys.macAddress}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="px-4 py-3.5 text-xs text-slate-700">
                              <p className="font-semibold text-slate-900">{sys.userName}</p>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">{sys.userId}</p>
                            </TableCell>

                            <TableCell className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    isActive
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[11px]'
                                      : 'bg-rose-50 text-rose-700 border-rose-200 font-bold text-[11px]'
                                  }
                                >
                                  {isActive ? 'Active' : 'Blocked'}
                                </Badge>
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                  <Clock className="size-3 text-slate-400" />
                                  {sys.lastActive}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="px-4 py-3.5 text-right whitespace-nowrap">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handlePromptBlockSystem(sys)}
                                className="h-8 px-3.5 text-xs font-semibold cursor-pointer text-white shadow-xs"
                                style={{ background: isActive ? BRAND.deep : BRAND.purple }}
                              >
                                {isActive ? (
                                  <>
                                    <Ban className="mr-1.5 size-3.5" />
                                    Block System
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-1.5 size-3.5" />
                                    Authorize
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 border-t border-border pt-3">
                  <TablePagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </SurfaceCard>
          </div>
        </MotionReveal>
      )}

      {/* Confirmation Modal for Block / Unblock */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={targetSystem?.status === 'active' ? 'text-purple-950 flex items-center gap-2' : 'text-purple-900 flex items-center gap-2'}>
              {targetSystem?.status === 'active' ? (
                <>
                  <Ban className="size-5 text-purple-700" />
                  Block System Access
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-5 text-purple-700" />
                  Authorize System Access
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1">
              {targetSystem?.status === 'active' ? (
                <>
                  Are you sure you want to block <strong>&quot;{targetSystem?.deviceName}&quot;</strong>?
                  <br />
                  <span className="font-mono text-[11px] text-slate-500 mt-1 block">UUID: {targetSystem?.hardwareSignature}</span>
                  This workstation terminal will immediately be disconnected and blocked from accessing the system.
                </>
              ) : (
                <>
                  Are you sure you want to unblock and authorize <strong>&quot;{targetSystem?.deviceName}&quot;</strong>?
                  <br />
                  <span className="font-mono text-[11px] text-slate-500 mt-1 block">UUID: {targetSystem?.hardwareSignature}</span>
                  This workstation terminal will regain full POS and dashboard operational access.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmToggleBlock}
              className="text-white font-semibold cursor-pointer shadow-sm"
              style={{ background: targetSystem?.status === 'active' ? BRAND.deep : BRAND.purple }}
            >
              {targetSystem?.status === 'active' ? 'Yes, Block System' : 'Yes, Authorize System'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SettingsPage
