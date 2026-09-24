import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
}

const drawerMotion = {
  initial: { x: '-100%' },
  animate: { x: 0 },
  exit: { x: '-100%' },
  transition: { type: 'spring', stiffness: 320, damping: 32 },
}

function SideNavLinks({ items, onNavigate }) {
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
              'relative shrink-0 cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold transition-colors duration-200 active:scale-[0.99]',
              isActive
                ? 'bg-[#f3e8f5]/60 text-[#8E238F]'
                : 'text-slate-700 hover:bg-slate-50 hover:text-[#8E238F]',
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

function SideDrawer({ open, onClose, items }) {
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
            aria-label="Close side menu"
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px]"
            {...overlayMotion}
            onClick={onClose}
          />
          <motion.aside
            className="fixed top-0 left-0 z-50 flex h-dvh w-[min(20rem,88vw)] flex-col bg-white shadow-2xl"
            {...drawerMotion}
            role="dialog"
            aria-modal="true"
            aria-label="Side navigation"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <BrandLogo size="sm" asLink={false} />
                <p className="text-sm font-semibold text-slate-800">{BRAND.product.split(' ')[0]}</p>
              </div>
              <button
                type="button"
                aria-label="Close side navigation"
                onClick={onClose}
                className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border text-slate-600 transition-colors hover:bg-slate-50 active:scale-95"
              >
                <X className="size-5" />
              </button>
            </div>

            <SideNavLinks items={items} onNavigate={onClose} />
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}

// Admin utility side nav — hamburger left of logo; panel slides from left
export function AppSideNav({ items, open, onOpenChange }) {
  if (!items?.length) return null

  return (
    <>
      <button
        type="button"
        aria-label="Open side menu"
        aria-expanded={open}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border text-slate-700 transition-colors hover:bg-slate-50 active:scale-95"
        onClick={() => onOpenChange(true)}
      >
        <Menu className="size-5" />
      </button>

      <SideDrawer open={open} onClose={() => onOpenChange(false)} items={items} />
    </>
  )
}

export default AppSideNav
