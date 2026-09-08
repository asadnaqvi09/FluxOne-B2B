import { tenantQuery } from '../../../config/db.js'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toDateParam(value) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function round1(value) {
  return Math.round(num(value) * 10) / 10
}

function formatRs(value) {
  const n = num(value)
  if (Math.abs(n) >= 1_000_000) {
    return `Rs. ${(n / 1_000_000).toFixed(2)} M`
  }
  if (Math.abs(n) >= 1_000) {
    return `Rs. ${Math.round(n).toLocaleString('en-PK')}`
  }
  return `Rs. ${n.toFixed(0)}`
}

function shiftDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function monthStart(isoDate) {
  return `${isoDate.slice(0, 7)}-01`
}

function addMonths(isoDate, delta) {
  const d = new Date(`${isoDate}T12:00:00.000Z`)
  d.setUTCMonth(d.getUTCMonth() + delta)
  return d.toISOString().slice(0, 10)
}

function yearStart(year) {
  return `${year}-01-01`
}

function buildKpiBlock({ value, previous, comparisonText, sublabel, target }) {
  const current = num(value)
  const prev = num(previous)
  let changePct = 0
  if (prev > 0) changePct = round1(((current - prev) / prev) * 100)
  else if (current > 0) changePct = 100

  const targetProgressPct =
    target && target > 0 ? round1(Math.min(200, (current / target) * 100)) : null

  return {
    value: current,
    formatted: formatRs(current),
    changePct,
    isPositive: changePct >= 0,
    comparisonText,
    sublabel: sublabel || null,
    targetProgressPct,
  }
}

async function listTenantBranches(tenantId, branchId = null) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT id, name
      FROM branches
      WHERE tenant_id = $1
        AND ($2::uuid IS NULL OR id = $2)
      ORDER BY name ASC
    `,
    [branchId || null],
  )
  return rows
}

async function salesNet(tenantId, { from, to, branchId }) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        count(*)::int AS "saleCount",
        COALESCE(sum(final_amount), 0)::float8 AS revenue,
        COALESCE(sum(final_amount - return_amount), 0)::float8 AS earning,
        COALESCE(sum(return_amount), 0)::float8 AS "returnAmount"
      FROM sales
      WHERE tenant_id = $1
        AND status IN ('completed', 'partial_refund')
        AND ($2::date IS NULL OR sold_at::date >= $2::date)
        AND ($3::date IS NULL OR sold_at::date <= $3::date)
        AND ($4::uuid IS NULL OR branch_id = $4)
    `,
    [from, to, branchId],
  )
  return {
    saleCount: rows[0]?.saleCount || 0,
    revenue: num(rows[0]?.revenue),
    earning: num(rows[0]?.earning),
    returnAmount: num(rows[0]?.returnAmount),
  }
}

async function salesProfit(tenantId, { from, to, branchId }) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        COALESCE(sum(si.line_total), 0)::float8 AS revenue,
        COALESCE(
          sum(
            si.line_total - (si.quantity * COALESCE(p.purchase_price, 0))
          ),
          0
        )::float8 AS profit
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id AND s.tenant_id = si.tenant_id
      JOIN products p ON p.id = si.product_id AND p.tenant_id = si.tenant_id
      WHERE si.tenant_id = $1
        AND s.status IN ('completed', 'partial_refund')
        AND si.is_exchange = false
        AND ($2::date IS NULL OR s.sold_at::date >= $2::date)
        AND ($3::date IS NULL OR s.sold_at::date <= $3::date)
        AND ($4::uuid IS NULL OR s.branch_id = $4)
    `,
    [from, to, branchId],
  )
  return {
    revenue: num(rows[0]?.revenue),
    profit: num(rows[0]?.profit),
  }
}

async function buildKpis(tenantId, { date, branchId }) {
  const asOf = date
  const yesterday = shiftDays(asOf, -1)
  const thisMonthFrom = monthStart(asOf)
  const prevMonthAnchor = addMonths(thisMonthFrom, -1)
  const prevMonthFrom = monthStart(prevMonthAnchor)
  // Last closed calendar month relative to selected date
  const lastMonthTo = shiftDays(thisMonthFrom, -1)
  const year = Number(asOf.slice(0, 4))
  const ytdFrom = yearStart(year)
  const prevYtdFrom = yearStart(year - 1)
  const prevYtdTo = `${year - 1}-${asOf.slice(5)}`

  const [
    today,
    yesterdaySales,
    lastMonth,
    priorMonth,
    thisYear,
    prevYearYtd,
    allTime,
  ] = await Promise.all([
    salesNet(tenantId, { from: asOf, to: asOf, branchId }),
    salesNet(tenantId, { from: yesterday, to: yesterday, branchId }),
    salesNet(tenantId, { from: prevMonthFrom, to: lastMonthTo, branchId }),
    salesNet(tenantId, {
      from: monthStart(addMonths(prevMonthFrom, -1)),
      to: shiftDays(prevMonthFrom, -1),
      branchId,
    }),
    salesNet(tenantId, { from: ytdFrom, to: asOf, branchId }),
    salesNet(tenantId, { from: prevYtdFrom, to: prevYtdTo, branchId }),
    salesNet(tenantId, { from: null, to: asOf, branchId }),
  ])

  const avgTicket =
    allTime.saleCount > 0 ? Math.round(allTime.earning / allTime.saleCount) : 0

  return {
    todayEarning: buildKpiBlock({
      value: today.earning,
      previous: yesterdaySales.earning,
      comparisonText: `vs. previous day (${formatRs(yesterdaySales.earning)})`,
      sublabel: `As of ${asOf}`,
      target: null,
    }),
    lastMonthEarning: buildKpiBlock({
      value: lastMonth.earning,
      previous: priorMonth.earning,
      comparisonText: `vs. prior month (${formatRs(priorMonth.earning)})`,
      sublabel: `${prevMonthFrom} → ${lastMonthTo}`,
      target: null,
    }),
    thisYearEarning: buildKpiBlock({
      value: thisYear.earning,
      previous: prevYearYtd.earning,
      comparisonText: `YTD vs ${year - 1} same period`,
      sublabel: `${ytdFrom} → ${asOf}`,
      target: null,
    }),
    totalSale: {
      ...buildKpiBlock({
        value: allTime.earning,
        previous: thisYear.earning,
        comparisonText: branchId
          ? 'Selected branch · all-time through date'
          : 'All branches · all-time through date',
        sublabel: `Avg ticket: ${formatRs(avgTicket)}`,
        target: null,
      }),
      transactions: allTime.saleCount,
      formattedTransactions: `${allTime.saleCount.toLocaleString('en-PK')} orders`,
    },
  }
}

async function monthlyBranchSeries(tenantId, { year, branchId }) {
  const from = yearStart(year)
  const to = `${year}-12-31`

  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        extract(month FROM s.sold_at)::int AS "monthIndex",
        s.branch_id AS "branchId",
        b.name AS "branchName",
        COALESCE(sum(s.final_amount), 0)::float8 AS revenue,
        COALESCE(sum(s.final_amount - s.return_amount), 0)::float8 AS earning
      FROM sales s
      JOIN branches b ON b.id = s.branch_id AND b.tenant_id = s.tenant_id
      WHERE s.tenant_id = $1
        AND s.status IN ('completed', 'partial_refund')
        AND s.sold_at::date >= $2::date
        AND s.sold_at::date <= $3::date
        AND ($4::uuid IS NULL OR s.branch_id = $4)
      GROUP BY 1, 2, 3
      ORDER BY 1, 3
    `,
    [from, to, branchId],
  )

  // Prefer COGS-based profit per month/branch when line items exist
  const { rows: profitRows } = await tenantQuery(
    tenantId,
    `
      SELECT
        extract(month FROM s.sold_at)::int AS "monthIndex",
        s.branch_id AS "branchId",
        COALESCE(
          sum(si.line_total - (si.quantity * COALESCE(p.purchase_price, 0))),
          0
        )::float8 AS profit
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id AND s.tenant_id = si.tenant_id
      JOIN products p ON p.id = si.product_id AND p.tenant_id = si.tenant_id
      WHERE si.tenant_id = $1
        AND s.status IN ('completed', 'partial_refund')
        AND si.is_exchange = false
        AND s.sold_at::date >= $2::date
        AND s.sold_at::date <= $3::date
        AND ($4::uuid IS NULL OR s.branch_id = $4)
      GROUP BY 1, 2
    `,
    [from, to, branchId],
  )

  const profitMap = new Map(
    profitRows.map((r) => [`${r.monthIndex}:${r.branchId}`, num(r.profit)]),
  )

  return rows.map((r) => ({
    monthIndex: r.monthIndex,
    branchId: r.branchId,
    branchName: r.branchName,
    revenue: num(r.revenue),
    earning: num(r.earning),
    profit: profitMap.has(`${r.monthIndex}:${r.branchId}`)
      ? profitMap.get(`${r.monthIndex}:${r.branchId}`)
      : num(r.earning),
  }))
}

async function buildBranchProfitOverview(tenantId, { year, branchId, branches }) {
  const series = await monthlyBranchSeries(tenantId, { year, branchId })
  const branchList = branches.length
    ? branches
    : [...new Map(series.map((s) => [s.branchId, { id: s.branchId, name: s.branchName }])).values()]

  const monthlyData = []
  let totalRevenue = 0
  let totalProfit = 0
  const branchProfitTotals = new Map()

  for (let m = 1; m <= 12; m += 1) {
    const monthRows = series.filter((s) => s.monthIndex === m)
    const revenue = monthRows.reduce((sum, r) => sum + r.revenue, 0)
    const profit = monthRows.reduce((sum, r) => sum + r.profit, 0)
    totalRevenue += revenue
    totalProfit += profit

    const byBranch = monthRows.map((r) => {
      branchProfitTotals.set(
        r.branchId,
        (branchProfitTotals.get(r.branchId) || 0) + r.profit,
      )
      return {
        branchId: r.branchId,
        branchName: r.branchName,
        revenue: r.revenue,
        profit: r.profit,
      }
    })

    // Ensure every known branch appears (zeros) for stable charts
    for (const b of branchList) {
      if (!byBranch.some((x) => x.branchId === b.id)) {
        byBranch.push({
          branchId: b.id,
          branchName: b.name,
          revenue: 0,
          profit: 0,
        })
      }
    }

    monthlyData.push({
      month: MONTH_LABELS[m - 1],
      monthIndex: m,
      revenue,
      profit,
      marginPct: revenue > 0 ? round1((profit / revenue) * 100) : 0,
      branches: byBranch.sort((a, b) => a.branchName.localeCompare(b.branchName)),
    })
  }

  let topBranch = null
  for (const b of branchList) {
    const profit = branchProfitTotals.get(b.id) || 0
    if (!topBranch || profit > topBranch.profit) {
      topBranch = { id: b.id, name: b.name, profit }
    }
  }

  const filterBranches = [
    { id: 'all', name: 'All Branches (Consolidated)' },
    ...branchList.map((b) => ({ id: b.id, name: b.name })),
  ]

  return {
    year,
    branches: filterBranches,
    summary: {
      totalRevenue,
      totalRevenueFormatted: formatRs(totalRevenue),
      totalProfit,
      totalProfitFormatted: formatRs(totalProfit),
      avgMarginPct: totalRevenue > 0 ? round1((totalProfit / totalRevenue) * 100) : 0,
      topBranch: topBranch
        ? {
            id: topBranch.id,
            name: topBranch.name,
            profit: topBranch.profit,
            profitFormatted: formatRs(topBranch.profit),
          }
        : null,
    },
    monthlyData,
  }
}

async function buildInventoryStatus(tenantId, { branchId, asOfDate }) {
  const { rows } = await tenantQuery(
    tenantId,
    `
      SELECT
        b.id AS "branchId",
        b.name AS "branchName",
        count(p.id)::int AS "totalSkus",
        count(*) FILTER (
          WHERE COALESCE(bi.quantity, 0) > p.reorder_point
        )::int AS "healthyStock",
        count(*) FILTER (
          WHERE COALESCE(bi.quantity, 0) > 0
            AND COALESCE(bi.quantity, 0) <= p.reorder_point
        )::int AS "lowStock",
        count(*) FILTER (
          WHERE COALESCE(bi.quantity, 0) > 0
            AND COALESCE(bi.quantity, 0) <= GREATEST(p.reorder_point * 0.25, 1)
            AND COALESCE(bi.quantity, 0) <= p.reorder_point
        )::int AS "criticalStock",
        count(*) FILTER (
          WHERE COALESCE(bi.quantity, 0) <= 0
        )::int AS "outOfStock",
        COALESCE(sum(COALESCE(bi.quantity, 0)), 0)::float8 AS "totalUnits",
        COALESCE(
          sum(COALESCE(bi.quantity, 0) * COALESCE(p.purchase_price, 0)),
          0
        )::float8 AS valuation
      FROM branches b
      LEFT JOIN products p
        ON p.tenant_id = b.tenant_id
       AND p.status = 'active'
       AND (p.branch_id IS NULL OR p.branch_id = b.id)
      LEFT JOIN branch_inventory bi
        ON bi.tenant_id = b.tenant_id
       AND bi.branch_id = b.id
       AND bi.product_id = p.id
      WHERE b.tenant_id = $1
        AND ($2::uuid IS NULL OR b.id = $2)
      GROUP BY b.id, b.name
      ORDER BY b.name ASC
    `,
    [branchId || null],
  )

  const branchBreakdown = rows.map((r) => {
    const totalSkus = r.totalSkus || 0
    const healthy = r.healthyStock || 0
    const low = r.lowStock || 0
    // Avoid double-counting: critical is subset of low; chart uses critical+out as red stack
    const critical = Math.min(r.criticalStock || 0, low)
    const out = r.outOfStock || 0
    const healthScore =
      totalSkus > 0 ? round1((healthy / totalSkus) * 100) : 100

    return {
      branchId: r.branchId,
      branchName: r.branchName,
      healthyStock: healthy,
      lowStock: Math.max(low - critical, 0),
      criticalStock: critical,
      outOfStock: out,
      totalSkus,
      totalUnits: num(r.totalUnits),
      valuation: num(r.valuation),
      valuationFormatted: formatRs(r.valuation),
      healthScore,
    }
  })

  const totalSkus = branchBreakdown.reduce((s, b) => s + b.totalSkus, 0)
  const healthy = branchBreakdown.reduce((s, b) => s + b.healthyStock, 0)
  const criticalAlerts = branchBreakdown.reduce(
    (s, b) => s + b.criticalStock + b.outOfStock,
    0,
  )
  const totalUnits = branchBreakdown.reduce((s, b) => s + b.totalUnits, 0)
  const valuation = branchBreakdown.reduce((s, b) => s + b.valuation, 0)

  return {
    asOfDate,
    timestamp: `As of ${asOfDate} · live stock`,
    summary: {
      totalStockUnits: totalUnits,
      totalValuation: valuation,
      totalValuationFormatted: formatRs(valuation),
      optimalRate: totalSkus > 0 ? round1((healthy / totalSkus) * 100) : 100,
      criticalAlerts,
    },
    branchBreakdown,
  }
}

/**
 * Full B2B Admin dashboard payload.
 * Query: date (YYYY-MM-DD), branchId (uuid | omit/all), year (optional, defaults to date's year)
 */
export async function getAdminDashboard(tenantId, filters = {}) {
  const date = toDateParam(filters.date) || new Date().toISOString().slice(0, 10)
  const year = Number(filters.year) || Number(date.slice(0, 4))
  const branchId = filters.branchId || null

  // When filtering one branch, list only that branch for charts; KPIs still scoped.
  const branches = await listTenantBranches(tenantId, null)
  const scopedBranches = branchId
    ? branches.filter((b) => b.id === branchId)
    : branches

  if (branchId && !scopedBranches.length) {
    const err = new Error('Branch not found in this company')
    err.status = 404
    throw err
  }

  const [kpis, branchProfitOverview, branchInventoryStatus] = await Promise.all([
    buildKpis(tenantId, { date, branchId }),
    buildBranchProfitOverview(tenantId, {
      year,
      branchId,
      branches: scopedBranches,
    }),
    buildInventoryStatus(tenantId, { branchId, asOfDate: date }),
  ])

  return {
    filters: {
      date,
      branchId: branchId || 'all',
      year,
    },
    branches: [
      { id: 'all', name: 'All Branches (Consolidated)' },
      ...branches.map((b) => ({ id: b.id, name: b.name })),
    ],
    kpis,
    branchProfitOverview,
    branchInventoryStatus,
    aiBusinessInsights: {
      phase: 2,
      available: false,
      message:
        'AI Business Insights Engine is planned for Phase 2 (tomorrow forecast, 7-day product velocity, causality).',
    },
  }
}
