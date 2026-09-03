import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Badge } from '@/components/ui/badge'
import { BRAND } from '@/lib/constants'

export function AiBusinessInsights({ data = {}, className }) {
  const peakHour = data?.dailySummary?.peakHour || '14:00–15:00'
  const topItem = data?.topProducts?.[0]?.name || data?.productMix?.[0]?.name || 'Top Seller'
  const lowStockCount = data?.inventory?.filter((i) => i.status === 'critical' || i.status === 'low')?.length || 0

  return (
    <SurfaceCard
      className={className}
      title="AI Business Insights"
      description="Automated machine learning intelligence & operational recommendations"
      actions={
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-purple-200 bg-purple-50 text-purple-900 font-bold text-xs flex items-center gap-1"
          >
            <Sparkles className="size-3 text-purple-700" />
            Phase 2 AI Engine
          </Badge>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Peak Demand Insight */}
        <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/70 to-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="flex size-7 items-center justify-center rounded-lg text-white"
              style={{ background: BRAND.purple }}
            >
              <TrendingUp className="size-4" />
            </div>
            <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">Peak Demand</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Peak checkout velocity occurs between <strong>{peakHour}</strong>. Ensure both POS counters are staffed 15 minutes prior to prevent queue bottlenecks.
          </p>
          <div className="pt-1 flex items-center gap-1.5 text-[11px] font-semibold text-purple-900">
            <CheckCircle2 className="size-3.5 text-purple-600" />
            Staff Optimization Active
          </div>
        </div>

        {/* Inventory Warning */}
        <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-white">
              <AlertTriangle className="size-4" />
            </div>
            <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">Stock Velocity</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {lowStockCount > 0 ? (
              <>
                <strong>{lowStockCount} inventory items</strong> are approaching reorder levels. Trigger an automated replenishment PO to central warehouse.
              </>
            ) : (
              <>Inventory levels are balanced across all fast-moving consumer SKUs today.</>
            )}
          </p>
          <div className="pt-1 flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
            <CheckCircle2 className="size-3.5 text-amber-600" />
            Threshold Monitoring Active
          </div>
        </div>

        {/* Revenue Growth Recommendation */}
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Lightbulb className="size-4" />
            </div>
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Cross-Sell Opportunity</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong>{topItem}</strong> accounts for maximum checkout conversions. Bundle with complementary products at POS to increase Average Basket Size.
          </p>
          <div className="pt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Margin Upsell Active
          </div>
        </div>
      </div>
    </SurfaceCard>
  )
}
