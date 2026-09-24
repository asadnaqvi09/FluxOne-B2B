import fluxOneLogo from '@/assets/FluxOne(2).png'
import { cn } from '@/lib/utils'
import { NavLink } from 'react-router-dom'
import { BRAND } from '@/lib/constants'

const sizes = {
  sm: 'size-9',
  md: 'size-14',
  lg: 'size-[88px]',
  xl: 'size-[min(160px,42vw)]',
}

export function BrandLogo({ className, size = 'md', withGlow = false }) {
  return (
    <NavLink to="/">
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full border border-gray-200',
        sizes[size] || sizes.md,
        withGlow && 'shadow-[0_0_60px_rgba(142,35,143,0.55)]',
        className,
      )}
      aria-label={BRAND.name}
    >
      <img
        src={fluxOneLogo}
        alt={BRAND.name}
        width={200}
        height={200}
        className="size-full object-contain"
        draggable={false}
        />
      </div>
    </NavLink>
  )
}
