import { motion, useReducedMotion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  isUp,
  trendText,
  badge,
  gradient,
  iconGradient,
  // Optional KPI footer (admin earnings cards)
  footer,
  progress,
  index = 0,
  className,
  onClick,
}) {
  const reduceMotion = useReducedMotion()
  const showProgress = progress != null && !Number.isNaN(Number(progress))
  const progressPct = showProgress ? Math.min(100, Math.max(0, Number(progress))) : 0

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 15 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-all duration-300 hover:border-purple-300 hover:shadow-[0_12px_32px_rgba(142,35,143,0.09)]',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent opacity-50 transition-opacity group-hover:opacity-100',
          gradient,
        )}
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-900">
                {label}
              </span>
              {badge && (
                <span className="rounded-md border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                  {badge}
                </span>
              )}
            </div>

            <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-800">
              {value}
            </p>

            {subtitle && (
              <p className="mt-1 truncate text-xs font-normal text-slate-500">{subtitle}</p>
            )}

            {trend != null && (
              <div className="mt-2.5 flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-xs font-semibold',
                    isUp ? 'text-purple-800' : 'text-slate-600',
                  )}
                >
                  {isUp ? (
                    <ArrowUpRight className="size-3.5 text-purple-700" />
                  ) : (
                    <ArrowDownRight className="size-3.5 text-slate-500" />
                  )}
                  {trend}
                </span>
                {trendText && (
                  <span className="truncate text-[11px] text-slate-400">{trendText}</span>
                )}
              </div>
            )}
          </div>

          {Icon && (
            <div
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs transition-transform duration-300 group-hover:scale-105',
                iconGradient || 'bg-gradient-to-br from-purple-700 to-indigo-900',
              )}
              style={{ background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.deep})` }}
            >
              <Icon className="size-5" strokeWidth={2} />
            </div>
          )}
        </div>

        {(footer || showProgress) && (
          <div className="mt-3 border-t border-slate-100 pt-2.5">
            <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-slate-400">
              <span className="truncate pr-2">{footer}</span>
              {showProgress ? (
                <span className="shrink-0 font-semibold text-purple-700">{progressPct}%</span>
              ) : null}
            </div>
            {showProgress ? (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPct}%`,
                    background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})`,
                  }}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </motion.article>
  )
}

export function StatsGrid({ children, columns = 3, className }) {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-4', colClasses[columns] || 'grid-cols-1 sm:grid-cols-3', className)}>
      {children}
    </div>
  )
}

export default StatCard
