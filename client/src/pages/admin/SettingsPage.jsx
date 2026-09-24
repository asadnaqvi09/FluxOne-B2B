import { useEffect, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { EmptyState } from '@/components/shared/EmptyState'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { BRAND } from '@/lib/constants'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  ADMIN_DEVICES_PAGE_SIZE,
  changeAdminPassword,
  useAdminCurrency,
  useAdminDevices,
} from '@/hooks/useAdminSettings'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAppDispatch } from '@/rtk/hooks'
import { setDefaultCurrency } from '@/rtk/features/auth/authSlice'
import {
  KeyRound,
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
  Loader2,
  MonitorOff,
  Coins,
} from 'lucide-react'

function formatLastActive(value) {
  if (!value) return 'Never'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleString()
}

export function SettingsPage() {
  const dispatch = useAppDispatch()
  const [activeTab, setActiveTab] = useState('security')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Currency Settings (local draft until Save)
  const {
    defaultCurrency,
    options: currencyOptions,
    loading: currencyLoading,
    saving: currencySaving,
    error: currencyError,
    saveCurrency,
  } = useAdminCurrency()
  const [selectedCurrency, setSelectedCurrency] = useState('PKR')

  useEffect(() => {
    if (defaultCurrency) setSelectedCurrency(defaultCurrency)
  }, [defaultCurrency])

  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery.trim(), 300)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(ADMIN_DEVICES_PAGE_SIZE)

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [targetSystem, setTargetSystem] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [debouncedQ, statusFilter])

  const {
    items: systems,
    stats,
    pagination,
    loading,
    mutating,
    error,
    setDeviceStatus,
  } = useAdminDevices({
    q: debouncedQ,
    status: statusFilter,
    page,
    limit,
  })

  const slowHint = useSlowLoadingHint(loading && activeTab === 'systems')
  const hasDeviceFilters = Boolean(debouncedQ) || statusFilter !== 'all'
  const currencyDirty = selectedCurrency !== defaultCurrency

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!currentPassword) {
      toastError('Please enter your current password')
      return
    }
    if (newPassword.length < 8) {
      toastError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toastError('New password and confirmation do not match')
      return
    }

    setPasswordSaving(true)
    const result = await changeAdminPassword({
      currentPassword,
      newPassword,
    })
    setPasswordSaving(false)

    if (!result.success) {
      toastError(result.error || 'Failed to update password')
      return
    }

    toastSuccess('Password updated successfully')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  async function handleSaveCurrency(e) {
    e.preventDefault()
    if (!selectedCurrency) {
      toastError('Please select a default currency')
      return
    }
    if (!currencyDirty) {
      toastSuccess('Currency is already up to date')
      return
    }

    const result = await saveCurrency(selectedCurrency)
    if (!result.success) {
      toastError(result.error || 'Failed to save currency')
      return
    }

    // Sync session so products / invoices / reports pick up the new default
    dispatch(setDefaultCurrency(result.data?.defaultCurrency || selectedCurrency))
    toastSuccess('Default currency saved')
  }

  function handlePromptBlockSystem(sys) {
    setTargetSystem(sys)
    setConfirmDialogOpen(true)
  }

  async function handleConfirmToggleBlock() {
    if (!targetSystem) return
    const isCurrentlyActive = targetSystem.status === 'active'
    const nextStatus = isCurrentlyActive ? 'blocked' : 'active'

    const result = await setDeviceStatus(targetSystem.id, nextStatus)
    if (!result.success) {
      toastError(result.error || 'Failed to update device status')
      return
    }

    toastSuccess(
      `${targetSystem.deviceName} is now ${
        nextStatus === 'blocked' ? 'BLOCKED from accessing the system' : 'ACTIVE & Authorized'
      }`,
    )
    setTargetSystem(null)
    setConfirmDialogOpen(false)
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="System Configuration & Security"
          title="Admin Settings"
          description="Security, default currency, and hardware signature system access controls"
        />
      </MotionHeader>

      <MotionReveal delay={0.05}>
        <div className="flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200 w-fit">
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
            onClick={() => setActiveTab('currency')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'currency'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="size-4" />
            Currency Settings
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
            All System Access ({stats.total})
          </button>
        </div>
      </MotionReveal>

      {activeTab === 'security' && (
        <MotionReveal delay={0.1}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
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
                    <Label className="text-xs font-bold text-slate-700">Current Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="h-10 text-sm"
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">New Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password (min 8 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-10 text-sm pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Confirm New Password</Label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-10 text-sm"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={passwordSaving}
                      className="w-full text-white font-semibold cursor-pointer shadow-sm"
                      style={{ background: BRAND.purple }}
                    >
                      {passwordSaving ? 'Updating…' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </SurfaceCard>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <SurfaceCard className="p-5">
                <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-purple-700" />
                  Security Protocols
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-900">Two-Factor Authentication</p>
                      <p className="text-[11px] text-slate-500">Email OTP verification for new terminals</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toastError('2FA is coming soon')}
                      className="h-7 text-xs font-bold bg-slate-100 text-slate-600"
                    >
                      Coming soon
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-900">Session Timeout Auto-Lock</p>
                      <p className="text-[11px] text-slate-500">Lock POS after 15 minutes of idle time</p>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                      15 mins
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-900">Hardware Signature Binding</p>
                      <p className="text-[11px] text-slate-500">Only verified MAC & UUID devices allowed</p>
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

      {activeTab === 'currency' && (
        <MotionReveal delay={0.1}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7">
              <SurfaceCard className="p-6">
                <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: BRAND.purple }}
                  >
                    <Coins className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Currency Settings</h3>
                    <p className="text-xs text-slate-500">
                      System-wide default for prices, orders, invoices, and reports
                    </p>
                  </div>
                </div>

                {currencyError ? (
                  <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {currencyError}
                  </div>
                ) : null}

                {currencyLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                    <Loader2 className="size-4 animate-spin" />
                    Loading currency settings…
                  </div>
                ) : (
                  <form onSubmit={handleSaveCurrency} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">
                        Default Currency <span className="text-rose-600">*</span>
                      </Label>
                      <NativeSelect
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                        className="h-10 text-sm"
                        required
                      >
                        {currencyOptions.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.label}
                          </option>
                        ))}
                      </NativeSelect>
                      <p className="text-[11px] text-slate-500">
                        Select the default currency to be used across the system.
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={currencySaving || !currencyDirty}
                        className="w-full text-white font-semibold cursor-pointer shadow-sm disabled:opacity-60"
                        style={{ background: BRAND.purple }}
                      >
                        {currencySaving ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </form>
                )}
              </SurfaceCard>
            </div>

            <div className="lg:col-span-5">
              <SurfaceCard className="p-5">
                <h4 className="font-bold text-sm text-slate-900 mb-2">How it applies</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Changing the default currency updates labels and formatting only. Stored amounts
                  are not converted. New product prices, orders, invoices, payments, and financial
                  reports will display using this currency.
                </p>
              </SurfaceCard>
            </div>
          </div>
        </MotionReveal>
      )}

      {activeTab === 'systems' && (
        <MotionReveal delay={0.1}>
          <div className="space-y-5">
            <SlowLoadingBanner show={slowHint} />

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: BRAND.purple }}
                >
                  <Monitor className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Registered Systems
                  </p>
                  <p className="text-lg font-bold text-slate-900 leading-tight">
                    {loading ? '—' : stats.total}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Active & Authorized
                  </p>
                  <p className="text-lg font-bold text-emerald-700 leading-tight">
                    {loading ? '—' : stats.active}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                  <Ban className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Blocked Systems
                  </p>
                  <p className="text-lg font-bold text-slate-700 leading-tight">
                    {loading ? '—' : stats.blocked}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Device Name, UUID, Branch, or User..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-slate-50/70 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 outline-none focus:border-purple-300 focus:bg-white focus:ring-1 focus:ring-purple-300"
                />
              </div>

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <span className="shrink-0 text-xs font-semibold text-slate-500">Status:</span>
                <div className="flex max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-0.5">
                  {[
                    { key: 'all', label: `All (${stats.total})` },
                    { key: 'active', label: `Active (${stats.active})` },
                    { key: 'blocked', label: `Blocked (${stats.blocked})` },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setStatusFilter(opt.key)}
                      className={`shrink-0 cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                        statusFilter === opt.key
                          ? 'bg-white font-bold text-purple-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <SurfaceCard
              title="List of System Access Terminals"
              description="Hardware signature access, MAC/IP bindings & authorization statuses"
            >
              {loading && systems.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin" />
                  Loading devices…
                </div>
              ) : systems.length === 0 ? (
                <EmptyState
                  icon={MonitorOff}
                  title={
                    hasDeviceFilters
                      ? 'No devices match these filters'
                      : 'No hardware devices registered yet'
                  }
                  description={
                    hasDeviceFilters
                      ? 'Clear search or status filters to see registered terminals.'
                      : 'POS and workstation devices will appear here once they register a hardware signature with this company.'
                  }
                  compact
                />
              ) : (
                <>
                  <ResponsiveDataShell
                    mobile={systems.map((sys) => {
                      const isActive = sys.status === 'active'
                      return (
                        <DataCard key={sys.id}>
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-white ${
                                isActive ? 'bg-purple-900' : 'bg-rose-600'
                              }`}
                            >
                              <Cpu className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {sys.deviceName}
                                  </p>
                                  <p className="text-[11px] font-medium text-slate-500">
                                    Branch: {sys.branch || 'Unassigned'}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    isActive
                                      ? 'shrink-0 border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-700'
                                      : 'shrink-0 border-rose-200 bg-rose-50 text-[11px] font-bold text-rose-700'
                                  }
                                >
                                  {isActive ? 'Active' : 'Blocked'}
                                </Badge>
                              </div>
                              <p className="mt-2 font-mono text-[11px] font-semibold tracking-wide text-purple-900">
                                {sys.hardwareSignature}
                              </p>
                              <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                                IP: {sys.ipAddress || '—'} · MAC: {sys.macAddress || '—'}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-900">{sys.userName}</p>
                              <p className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Clock className="size-3 text-slate-400" />
                                {formatLastActive(sys.lastActiveAt)}
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                disabled={mutating}
                                onClick={() => handlePromptBlockSystem(sys)}
                                className="mt-3 h-8 w-full cursor-pointer px-3.5 text-xs font-semibold text-white shadow-xs"
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
                            </div>
                          </div>
                        </DataCard>
                      )
                    })}
                    desktop={
                      <Table className="min-w-[44rem] w-full text-left text-sm">
                        <TableHeader>
                          <TableRow className="text-xs text-slate-500 uppercase">
                            <TableHead className="px-4 py-3 font-medium">Device & Branch</TableHead>
                            <TableHead className="px-4 py-3 font-medium">
                              Hardware Signature & Network
                            </TableHead>
                            <TableHead className="hidden px-4 py-3 font-medium lg:table-cell">
                              Assigned User
                            </TableHead>
                            <TableHead className="px-4 py-3 font-medium">Status & Activity</TableHead>
                            <TableHead className="sticky right-0 z-[1] bg-slate-200/80 px-4 py-3 text-right font-medium">
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {systems.map((sys) => {
                            const isActive = sys.status === 'active'
                            return (
                              <TableRow
                                key={sys.id}
                                className="group transition-colors hover:bg-slate-50/70"
                              >
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
                                      <p className="text-xs leading-tight font-semibold text-slate-900">
                                        {sys.deviceName}
                                      </p>
                                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                                        Branch: {sys.branch || 'Unassigned'}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell className="px-4 py-3.5">
                                  <div>
                                    <span className="inline-block rounded-md border border-purple-100 bg-purple-50 px-2 py-0.5 font-mono text-xs font-semibold tracking-wide whitespace-nowrap text-purple-900">
                                      {sys.hardwareSignature}
                                    </span>
                                    <p className="mt-1 font-mono text-[11px] text-slate-500">
                                      IP: {sys.ipAddress || '—'} · MAC: {sys.macAddress || '—'}
                                    </p>
                                  </div>
                                </TableCell>

                                <TableCell className="hidden px-4 py-3.5 text-xs text-slate-700 lg:table-cell">
                                  <p className="font-semibold text-slate-900">{sys.userName}</p>
                                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                                    {sys.userId || '—'}
                                  </p>
                                </TableCell>

                                <TableCell className="px-4 py-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={
                                        isActive
                                          ? 'border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-700'
                                          : 'border-rose-200 bg-rose-50 text-[11px] font-bold text-rose-700'
                                      }
                                    >
                                      {isActive ? 'Active' : 'Blocked'}
                                    </Badge>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                      <Clock className="size-3 text-slate-400" />
                                      {formatLastActive(sys.lastActiveAt)}
                                    </span>
                                  </div>
                                </TableCell>

                                <TableCell className="sticky right-0 z-[1] bg-white px-4 py-3.5 text-right whitespace-nowrap group-hover:bg-slate-50/70">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={mutating}
                                    onClick={() => handlePromptBlockSystem(sys)}
                                    className="h-8 cursor-pointer px-3.5 text-xs font-semibold text-white shadow-xs"
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
                          })}
                        </TableBody>
                      </Table>
                    }
                  />

                  <TablePagination
                    page={pagination.page || page}
                    pageCount={pagination.pageCount || 1}
                    totalItems={pagination.total || 0}
                    pageSize={limit}
                    onPageChange={setPage}
                    onPageSizeChange={(next) => {
                      setLimit(next)
                      setPage(1)
                    }}
                    loading={loading}
                  />
                </>
              )}
            </SurfaceCard>
          </div>
        </MotionReveal>
      )}

      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title={
          targetSystem?.status === 'active' ? 'Block System Access' : 'Authorize System Access'
        }
        description={
          targetSystem?.status === 'active' ? (
            <>
              Are you sure you want to block <strong>&quot;{targetSystem?.deviceName}&quot;</strong>?
              <span className="font-mono text-[11px] text-slate-500 mt-1 block">
                UUID: {targetSystem?.hardwareSignature}
              </span>
              This workstation will be blocked from accessing the system.
            </>
          ) : (
            <>
              Are you sure you want to authorize <strong>&quot;{targetSystem?.deviceName}&quot;</strong>?
              <span className="font-mono text-[11px] text-slate-500 mt-1 block">
                UUID: {targetSystem?.hardwareSignature}
              </span>
              This workstation will regain operational access.
            </>
          )
        }
        confirmLabel={
          targetSystem?.status === 'active' ? 'Yes, Block System' : 'Yes, Authorize System'
        }
        variant={targetSystem?.status === 'active' ? 'destructive' : 'default'}
        loading={mutating}
        onConfirm={handleConfirmToggleBlock}
      />
    </div>
  )
}

export default SettingsPage
