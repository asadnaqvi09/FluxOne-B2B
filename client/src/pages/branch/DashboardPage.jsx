import { FileDown, Printer, Calendar } from 'lucide-react'
import { BranchKpiCards } from '@/components/feature/branch/dashboard/BranchKpiCards'
import { BranchWelcomeBanner } from '@/components/feature/branch/dashboard/BranchWelcomeBanner'
import { DailySalesSummary } from '@/components/feature/branch/dashboard/DailySalesSummary'
import { CounterSalesCard } from '@/components/feature/branch/dashboard/CounterSalesCard'
import { InventoryStatusChart } from '@/components/feature/branch/dashboard/InventoryStatusChart'
import { ProductSalesInsights } from '@/components/feature/branch/dashboard/ProductSalesInsights'
import { SalesChart } from '@/components/feature/branch/dashboard/SalesChart'
import { StaffPerformanceTable } from '@/components/feature/branch/dashboard/StaffPerformanceTable'
import { AiBusinessInsights } from '@/components/feature/branch/dashboard/AiBusinessInsights'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { useBranchDashboard } from '@/hooks/useBranchDashboard'
import { useAuthSession } from '@/hooks/useAuthSession'
import { BRAND } from '@/lib/constants'
import { formatCurrency, formatPct } from '@/lib/mapBranchDashboard'
import { toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'

export function DashboardPage() {
  const { data, date, setDate, loading, source } = useBranchDashboard()
  const { user } = useAuthSession()

  function handleDownloadPDF() {
    toastSuccess('Preparing Branch Executive Performance PDF report...')
    const printWindow = window.open('', '_blank', 'width=850,height=900')
    if (!printWindow) {
      window.print()
      return
    }

    const branchName = data.branchName || user?.branchName || 'Wah Cantt Main Branch'
    const managerName = user?.name || 'Bilal Khan (Branch Manager)'
    const kpis = data.kpis || {}
    const summary = data.dailySummary || {}
    const topList = (data.topProducts || []).slice(0, 4)
    const lowList = (data.lowProducts || []).slice(0, 4)
    const staffList = (data.staff || []).slice(0, 6)
    const inventoryList = (data.inventory || []).slice(0, 6)
    const counters = data.counters || []

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Branch_Report_${branchName.replace(/\s+/g, '_')}_${date}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background: #ffffff; color: #0f172a; padding: 18px; line-height: 1.4; font-size: 12px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #8E238F; padding-bottom: 14px; margin-bottom: 18px; }
            .brand-name { font-size: 20px; font-weight: 800; color: #412283; }
            .sub-title { font-size: 11px; color: #64748b; margin-top: 2px; }
            .meta-badge { background: #f3e8f5; color: #8E238F; padding: 3px 10px; border-radius: 9999px; font-weight: 700; font-size: 11px; display: inline-block; }
            .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
            .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
            .kpi-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; }
            .kpi-val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
            .section-title { font-size: 13px; font-weight: 700; color: #1e1b4b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; margin-top: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; padding: 6px 8px; background: #f1f5f9; }
            td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
            .footer { margin-top: 24px; padding-top: 12px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 10px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand-name">FluxOne Management Systems</div>
              <div class="sub-title">Branch Performance & Daily Analytics Executive Report</div>
              <div class="sub-title"><strong>Branch:</strong> ${branchName} · <strong>Manager:</strong> ${managerName}</div>
            </div>
            <div style="text-align: right;">
              <span class="meta-badge">Report Date: ${date}</span>
              <div class="sub-title" style="margin-top: 5px;">Generated: ${new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          <div class="grid-4">
            <div class="kpi-card">
              <div class="kpi-label">Total Sales</div>
              <div class="kpi-val">${formatCurrency(kpis.totalSales)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Gross Profit</div>
              <div class="kpi-val" style="color: #059669;">${formatCurrency(kpis.profit)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Transactions</div>
              <div class="kpi-val">${Number(kpis.saleCount || summary.orders || 0).toLocaleString()}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Average Ticket</div>
              <div class="kpi-val">${formatCurrency(kpis.avgTicket)}</div>
            </div>
          </div>

          <div class="section-title">Daily Sales Throughput & POS Counters</div>
          <table>
            <thead>
              <tr>
                <th>Total Revenue</th>
                <th>Total Items Sold</th>
                <th>Peak Sales Window</th>
                <th>Peak Revenue</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${formatCurrency(summary.revenue || kpis.totalSales)}</strong></td>
                <td>${Number(summary.itemsSold || 0).toLocaleString()} units</td>
                <td>${summary.peakHour || '14:00 - 15:00'}</td>
                <td>${summary.peakHourSales ? formatCurrency(summary.peakHourSales) : '—'}</td>
              </tr>
            </tbody>
          </table>

          ${
            counters.length > 0
              ? `
            <table>
              <thead>
                <tr>
                  <th>POS Counter Name</th>
                  <th>Total Sales</th>
                  <th>Orders Processed</th>
                </tr>
              </thead>
              <tbody>
                ${counters
                  .map(
                    (c) => `
                  <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${formatCurrency(c.sales)}</td>
                    <td>${c.orders} orders</td>
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>
          `
              : ''
          }

          <div style="display: flex; gap: 14px;">
            <div style="flex: 1;">
              <div class="section-title">Top Higher Sales Products</div>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Units</th>
                    <th>Sales</th>
                  </tr>
                </thead>
                <tbody>
                  ${topList
                    .map(
                      (p) => `
                    <tr>
                      <td><strong>${p.name}</strong></td>
                      <td>${p.units} units</td>
                      <td style="color: #059669; font-weight: 700;">${formatCurrency(p.sales)}</td>
                    </tr>
                  `,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>

            <div style="flex: 1;">
              <div class="section-title">Lowest Volume Products</div>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Units</th>
                    <th>Sales</th>
                  </tr>
                </thead>
                <tbody>
                  ${lowList
                    .map(
                      (p) => `
                    <tr>
                      <td><strong>${p.name}</strong></td>
                      <td>${p.units} units</td>
                      <td style="color: #e11d48; font-weight: 700;">${formatCurrency(p.sales)}</td>
                    </tr>
                  `,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="section-title">Staff On-Duty & Inventory Status Summary</div>
          <table>
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role / Designation</th>
                <th>Status</th>
                <th>Points / Score</th>
              </tr>
            </thead>
            <tbody>
              ${
                staffList.length > 0
                  ? staffList
                      .map(
                        (s) => `
                    <tr>
                      <td><strong>${s.name || s.fullName}</strong></td>
                      <td>${s.role || s.designation || 'Staff'}</td>
                      <td>${s.status || 'Active'}</td>
                      <td>${s.points || 100} pts</td>
                    </tr>
                  `,
                      )
                      .join('')
                  : `<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Branch staff roster active</td></tr>`
              }
            </tbody>
          </table>

          <div class="footer">
            FluxOne Management System · Enterprise Branch Analytics Report · Official Document
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          eyebrow="Branch Overview"
          title="Branch Dashboard"
          description="Sales, profit, staff & inventory for the selected date"
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {source === 'dummy' ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                  Demo data
                </span>
              ) : null}

              <label className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs sm:text-sm shadow-2xs">
                <Calendar className="size-4 text-purple-700 shrink-0" />
                <span className="shrink-0 text-slate-500 font-medium">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="min-w-0 border-0 bg-transparent font-semibold text-slate-900 outline-none"
                />
              </label>

              <Button
                type="button"
                onClick={handleDownloadPDF}
                className="text-white font-semibold cursor-pointer shadow-xs gap-1.5"
                style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
              >
                <FileDown className="size-4" />
                Download Report (PDF)
              </Button>
            </div>
          }
        />
      </MotionHeader>

      <BranchWelcomeBanner />

      <div
        className={cn(
          'space-y-5 transition-opacity duration-300 sm:space-y-6',
          loading && 'opacity-60',
        )}
      >
        {/* 1. KPI Metric Cards */}
        <BranchKpiCards kpis={data.kpis} />

        {/* 2. Daily Sales Summary Snapshot */}
        <MotionReveal delay={0.03}>
          <DailySalesSummary summary={data.dailySummary} />
        </MotionReveal>

        {/* 3. Sales Curve & Product Velocity (Side-by-Side Charts) */}
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 lg:gap-6">
          <MotionReveal delay={0.06} className="h-full">
            <SalesChart series={data.salesByHour} className="h-full" />
          </MotionReveal>
          <MotionReveal delay={0.09} className="h-full">
            <ProductSalesInsights
              productMix={data.productMix}
              topProducts={data.topProducts}
              lowProducts={data.lowProducts}
              className="h-full"
            />
          </MotionReveal>
        </div>

        {/* 4. POS Counter Sales (Full-Width Adaptive Terminal Strip) */}
        <MotionReveal delay={0.11}>
          <CounterSalesCard counters={data.counters} />
        </MotionReveal>

        {/* 5. Staff Performance & Inventory Status (Side-by-Side As Previous) */}
        <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-2 xl:gap-6">
          <MotionReveal delay={0.13} className="h-full">
            <StaffPerformanceTable staff={data.staff} className="h-full" />
          </MotionReveal>
          <MotionReveal delay={0.16} className="h-full">
            <InventoryStatusChart inventory={data.inventory} className="h-full" />
          </MotionReveal>
        </div>

        {/* 6. AI Business Insights (Full-Width Executive Component) */}
        <MotionReveal delay={0.18}>
          <AiBusinessInsights data={data} />
        </MotionReveal>
      </div>

      <p className="text-center text-[11px] text-slate-400">
        Accent · <span style={{ color: BRAND.purple }}>FluxOne</span> branch analytics · Phase 2 Platform
      </p>
    </div>
  )
}

export default DashboardPage