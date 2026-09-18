import { NavLink } from 'react-router-dom'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { MobileNav } from '@/layouts/Navbar/MobileNav'
import { UserMenu } from '@/layouts/Navbar/UserMenu'
import { NotificationBell } from '@/layouts/Navbar/NotificationBell'
import { useAuthSession } from '@/hooks/useAuthSession'
import { BRAND, ROLES } from '@/lib/constants'
import { getNavItemsForRole } from '@/lib/nav'
import { cn } from '@/lib/utils'

function DesktopNavLinks({ items }) {
  return (
    <nav className="hidden h-full min-w-0 flex-1 items-stretch gap-1 overflow-x-auto md:flex">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'relative flex shrink-0 cursor-pointer items-center px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-200',
              isActive ? 'text-[#8E238F]' : 'text-slate-800 hover:text-[#8E238F]',
            )
          }
        >
          {({ isActive }) => (
            <>
              {item.label}
              {isActive ? (
                <span
                  className="absolute right-0 bottom-0 left-0 h-[3px]"
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

export function AppTopNav({ className }) {
  const { role } = useAuthSession()
  const items = getNavItemsForRole(role)
  const showBell = role === ROLES.B2B_ADMIN || role === ROLES.BRANCH_MANAGER

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center border-b border-border bg-white px-3 sm:h-[4.25rem] sm:px-6',
        className,
      )}
    >
      <div className="flex h-full w-full min-w-0 items-center gap-2 sm:gap-4 lg:gap-8">
        <BrandLogo size="sm" className="size-10 shrink-0 sm:size-12" />
        <DesktopNavLinks items={items} />
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          {showBell ? <NotificationBell /> : null}
          <UserMenu className="hidden md:block" />
          <MobileNav items={items} />
        </div>
      </div>
    </header>
  )
}
