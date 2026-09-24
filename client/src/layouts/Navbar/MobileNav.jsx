import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, ScrollText, Settings, UserRound, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useAuthSession } from '@/hooks/useAuthSession'
import { BRAND, ROLES } from '@/lib/constants'
import { roleDisplayName } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { PATHS, profilePathForRole } from '@/router/paths'

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
}

const drawerMotion = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { type: 'spring', stiffness: 320, damping: 32 },
}

function MobileNavLinks({ items, onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'relative shrink-0 cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors duration-200 active:scale-[0.99]',
              isActive ? 'text-[#8E238F] bg-[#f3e8f5]/60' : 'text-slate-700 hover:bg-slate-50 hover:text-[#8E238F]',
            )
          }
        >
          {({ isActive }) => (
            <>
              {item.label}
              {isActive ? (
                <span
                  className="absolute right-2 bottom-0 left-2 h-[3px] rounded-full"
                  style={{ background: BRAND.purple }}
                />
              ) : null}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function MobileDrawer({ open, onClose, items }) {
  const navigate = useNavigate()
  const { user, role, logout } = useAuthSession()
  const name = user?.name || 'User'
  const roleLabel = roleDisplayName(role)
  const userId = user?.email || user?.id || '—'
  const profilePath = profilePathForRole(role)
  const imageUrl = user?.imageUrl || null
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] md:hidden"
            {...overlayMotion}
            onClick={onClose}
          />
          <motion.aside
            className="fixed top-0 right-0 z-50 flex h-dvh w-[min(20rem,88vw)] flex-col bg-white shadow-2xl md:hidden"
            {...drawerMotion}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <BrandLogo size="sm" asLink={false} />
                <p className="text-sm font-semibold text-slate-800">{BRAND.product.split(' ')[0]}</p>
              </div>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={onClose}
                className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border text-slate-600 transition-colors hover:bg-slate-50 active:scale-95"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 border-b border-border px-4 py-4">
              <UserAvatar
                name={name}
                loginId={user?.email}
                imageUrl={imageUrl}
                className="size-11"
                fallbackClassName="text-sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
                <p className="truncate text-xs text-slate-500">{roleLabel}</p>
                <p className="mt-0.5 truncate text-xs font-medium" style={{ color: BRAND.deep }}>
                  {userId}
                </p>
              </div>
            </div>

            <MobileNavLinks items={items} onNavigate={onClose} />

            <div className="mt-auto space-y-1 border-t border-border p-3">
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.99]"
                onClick={() => {
                  onClose()
                  navigate(profilePath)
                }}
              >
                <UserRound className="size-4" />
                Profile
              </button>
              {role === ROLES.BRANCH_MANAGER ? (
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.99]"
                  onClick={() => {
                    onClose()
                    navigate(PATHS.branch.logs)
                  }}
                >
                  <ScrollText className="size-4" />
                  Logs
                </button>
              ) : null}
              {role === ROLES.B2B_ADMIN ? (
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.99]"
                  onClick={() => {
                    onClose()
                    navigate(PATHS.admin.settings)
                  }}
                >
                  <Settings className="size-4" />
                  Settings
                </button>
              ) : null}
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 active:scale-[0.99]"
                onClick={() => {
                  onClose()
                  logout()
                  navigate(PATHS.login, { replace: true })
                }}
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}

// Mobile menu trigger + drawer. Hidden from `md` and up.
export function MobileNav({ items }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border text-slate-700 transition-colors hover:bg-slate-50 active:scale-95 md:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </button>

      <MobileDrawer open={open} onClose={() => setOpen(false)} items={items} />
    </>
  )
}
