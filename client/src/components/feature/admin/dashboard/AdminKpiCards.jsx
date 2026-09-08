import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  CalendarCheck,
  TrendingUp,
  Receipt,
} from 'lucide-react'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

const KPI_CONFIG = [
  {
    key: 'todayEarning',
    title: 'Today Earning',
    subtitle: 'Selected day',
    icon: CircleDollarSign,
    gradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
    iconGradient: 'from-purple-600 to-indigo-700',
  },
  {
    key: 'lastMonthEarning',
    title: 'Last Month Earning',
    subtitle: 'Closed calendar month',
    icon: CalendarCheck,
    gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
    iconGradient: 'from-blue-600 to-cyan-600',
  },
  {
    key: 'thisYearEarning',
    title: 'This Year Earning',
    subtitle: 'Year to date',
    icon: TrendingUp,
    gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    iconGradient: 'from-emerald-600 to-teal-700',
  },
  {
    key: 'totalSale',
    title: 'Total Sale',
    subtitle: 'All-time through date',
    icon: Receipt,
    gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
    iconGradient: 'from-amber-500 to-orange-600',
  },
]

export function AdminKpiCards({ kpis = {}, className }) {
  const reduceMotion = useReducedMotion()

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {KPI_CONFIG.map((config, index) => {
        const Icon = config.icon
        const item = kpis[config.key] || {}
        const isUp = item.isPositive ?? true
        const displayValue = item.formatted || 'Rs. 0'
        const changeLabel =
          item.changePct !== undefined && item.changePct !== null
            ? `${item.changePct >= 0 ? '+' : ''}${item.changePct}%`
            : '—'
        const progress = Math.min(
          100,
          Math.max(0, Number(item.targetProgressPct) || (item.value > 0 ? 100 : 0)),
        )
        const footerLeft =
          item.sublabel ||
          (config.key === 'totalSale' && item.formattedTransactions
            ? item.formattedTransactions
            : config.subtitle)

        return (
          <motion.article
            key={config.key}
            initial={reduceMotion ? false : { opacity: 0, y: 15 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-all duration-300 hover:border-purple-300 hover:shadow-[0_12px_32px_rgba(142,35,143,0.09)]"
          >
            <div
              className={cn(
                'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity group-hover:opacity-100',
                config.gradient,
              )}
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1"
              style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
            />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                    {config.title}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-800">
                    {displayValue}
                  </h3>
                </div>

                <div
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition-transform duration-300 group-hover:scale-105',
                    config.iconGradient,
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
                    isUp
                      ? 'bg-purple-50 text-purple-900 ring-purple-200'
                      : 'bg-slate-100 text-slate-700 ring-slate-200',
                  )}
                >
                  {isUp ? (
                    <ArrowUpRight className="size-3.5 text-purple-700" />
                  ) : (
                    <ArrowDownRight className="size-3.5 text-slate-500" />
                  )}
                  {changeLabel}
                </span>

                <span className="truncate text-[11px] font-normal text-slate-500">
                  {item.comparisonText || config.subtitle}
                </span>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-2.5">
                <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-slate-400">
                  <span className="truncate pr-2">{footerLeft}</span>
                  {item.targetProgressPct != null ? (
                    <span className="shrink-0 font-semibold text-purple-700">{progress}%</span>
                  ) : null}
                </div>
                {item.targetProgressPct != null ? (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})`,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </motion.article>
        )
      })}
    </div>
  )
}

export default AdminKpiCards
