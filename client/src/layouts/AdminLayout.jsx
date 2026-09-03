import { useState } from 'react'
import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, Settings, UserRound, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { BRAND } from '@/lib/constants'
import { clearAdminSession } from '@/config/adminAuth.config'
import { toastSuccess } from '@/lib/toast'
import { PATHS } from '@/router/paths'
import { useAuthSession } from '@/hooks/useAuthSession'
import { getInitials } from '@/lib/nav'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

function UserAvatar({ initials = 'AD', className }) {
  return (
    <div
      className={cn(
        'flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
        className,
      )}
      style={{ background: BRAND.purple }}
    >
      {initials}
    </div>
  )
}

const ADMIN_NAV_LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/branches', label: 'Manage Branches' },
  { to: '/admin/invoices', label: 'Invoices' },
  { to: '/admin/tax-profit', label: 'Tax & Profit' },
  { to: '/admin/company', label: 'Company & Policies' },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout } = useAuthSession()

  const name = user?.name || 'Admin'
  const initials = getInitials(name, user?.email)
  const tenantName = user?.tenantName || (user?.tenantSlug === 'company-b' ? 'Company B' : 'Company A')
  const roleLabel = `${tenantName} · B2B Admin`
  const adminId = user?.email || user?.id || (user?.tenantSlug === 'company-b' ? 'admin@companyb.local' : 'admin@companya.local')

  function handleLogout() {
    if (logout) logout()
    clearAdminSession()
    toastSuccess('Logged out successfully')
    navigate(PATHS.login, { replace: true })
  }

  return (
    <div className="min-h-dvh bg-[#f7f8fc]">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-white px-3 sm:h-[4.25rem] sm:px-6">
        <div className="flex h-full w-full min-w-0 items-center justify-between gap-2 sm:gap-6">
          {/* Logo & Desktop Nav Tabs */}
          <div className="flex items-center gap-3 lg:gap-6 min-w-0">
            {/* Mobile Menu Hamburger Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex size-9 items-center justify-center rounded-xl border border-border text-slate-700 hover:bg-slate-50 lg:hidden cursor-pointer shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="size-5" />
            </button>

            <BrandLogo size="sm" className="size-9 shrink-0 sm:size-11" />

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 shrink-0 overflow-x-auto py-1">
              {ADMIN_NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `relative flex items-center px-3 py-2 text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap ${
                      isActive ? 'text-[#8E238F]' : 'text-slate-600 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {link.label}
                      {isActive && (
                        <span
                          className="absolute right-0 bottom-0 left-0 h-[3px]"
                          style={{ background: BRAND.purple }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right Role Context Badge & Dropdown User Menu */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Deep purple badge */}
            <span
              className="hidden max-w-[14rem] truncate rounded-full px-2.5 py-1 text-xs font-semibold text-white md:inline-block lg:max-w-xs"
              style={{ background: BRAND.deep }}
            >
              {tenantName} · B2B Admin
            </span>

            {/* Dropdown User Menu */}
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#8E238F]/40">
                  <div className="flex items-center gap-2 py-1">
                    <UserAvatar initials={initials} />
                    <div className="hidden min-w-0 text-left sm:block">
                      <p className="truncate text-sm leading-tight font-semibold text-slate-900">{name}</p>
                      <p className="truncate text-xs leading-tight text-slate-500">{roleLabel}</p>
                    </div>
                    <ChevronDown className="size-4 shrink-0 text-slate-400" strokeWidth={1.75} />
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="mt-2 w-64 rounded-2xl border border-border bg-white p-0 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
                >
                  {/* Top user profile details card */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <UserAvatar initials={initials} className="size-11 text-sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
                      <p className="truncate text-xs text-slate-500">{roleLabel}</p>
                      <p className="mt-0.5 truncate text-xs font-medium" style={{ color: BRAND.deep }}>
                        {adminId}
                      </p>
                    </div>
                  </div>

                  <DropdownMenuSeparator className="my-0" />

                  {/* Actions list */}
                  <div className="p-1.5">
                    <DropdownMenuItem
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-700 cursor-pointer text-sm"
                      onClick={() => navigate('/admin/profile')}
                    >
                      <UserRound className="size-4" />
                      Profile
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-700 cursor-pointer text-sm"
                      onClick={() => navigate('/admin/settings')}
                    >
                      <Settings className="size-4" />
                      Settings
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-red-600 hover:bg-red-50 cursor-pointer text-sm font-medium"
                      onClick={handleLogout}
                    >
                      <LogOut className="size-4" />
                      Logout
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs lg:hidden"
            />

            {/* Slide-out Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col bg-white shadow-2xl lg:hidden"
            >
              {/* Drawer Header */}
              <div className="flex h-14 items-center justify-between border-b border-border px-4">
                <BrandLogo size="sm" className="size-8" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                {ADMIN_NAV_LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-purple-50 text-purple-900 font-bold border border-purple-100'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              {/* Drawer Footer */}
              <div className="border-t border-border p-3 space-y-2 bg-slate-50/70">
                <div className="flex items-center gap-3 px-2">
                  <UserAvatar initials="AS" className="size-9 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900">{name}</p>
                    <p className="truncate text-[11px] text-slate-500">{roleLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate('/admin/profile')
                    }}
                    className="flex-1 rounded-lg border border-border bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-center"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex-1 rounded-lg bg-rose-50 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 text-center"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
