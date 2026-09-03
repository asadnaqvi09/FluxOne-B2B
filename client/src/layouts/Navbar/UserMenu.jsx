import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useAuthSession } from '@/hooks/useAuthSession'
import { ROLES } from '@/lib/constants'
import { roleDisplayName } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { PATHS, profilePathForRole } from '@/router/paths'

export function UserMenu({ className }) {
  const navigate = useNavigate()
  const { user, role, logout } = useAuthSession()
  const name = user?.name || 'User'
  const roleLabel = roleDisplayName(role)
  const userId = user?.email || user?.id || '—'
  const profilePath = profilePathForRole(role)
  const imageUrl = user?.imageUrl || null

  return (
    <div className={cn('relative', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#8E238F]/40">
          <div className="flex items-center gap-2.5 py-1">
            <UserAvatar
              name={name}
              loginId={user?.email}
              imageUrl={imageUrl}
              className="size-10"
            />
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
          <div className="flex items-center gap-3 px-4 py-3">
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
              <p className="mt-0.5 truncate text-xs font-medium text-[#412283]">{userId}</p>
            </div>
          </div>

          <DropdownMenuSeparator className="my-0" />

          <div className="p-1.5">
            <DropdownMenuItem
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-700 cursor-pointer"
              onClick={() => navigate(profilePath)}
            >
              <UserRound className="size-4" />
              Profile
            </DropdownMenuItem>
            {role === ROLES.B2B_ADMIN && (
              <DropdownMenuItem
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-700 cursor-pointer"
                onClick={() => navigate('/admin/settings')}
              >
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-red-600 hover:bg-red-50 cursor-pointer"
              onClick={() => {
                logout()
                navigate(PATHS.login, { replace: true })
              }}
            >
              <LogOut className="size-4" />
              Logout
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
