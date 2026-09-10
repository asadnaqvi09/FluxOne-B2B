import { useState, useMemo } from 'react'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { Trophy, MapPin } from 'lucide-react'

const BRANCH_RANKINGS = [
  {
    rank: 1,
    name: 'Wah Cantt Branch',
    location: 'Wah Cantt, Punjab',
    manager: 'Bilal Khan',
    ytdRevenue: 'Rs. 46.85 M',
    ytdProfit: 'Rs. 16.39 M',
    profitMargin: '35.0%',
    growthRate: '+24.6%',
    status: 'Top Performer',
    statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    rank: 2,
    name: 'Islamabad Flagship',
    location: 'F-7 Markaz, Islamabad',
    manager: 'Hamza Malik',
    ytdRevenue: 'Rs. 33.70 M',
    ytdProfit: 'Rs. 11.79 M',
    profitMargin: '35.0%',
    growthRate: '+28.2%',
    status: 'Fastest Growing',
    statusBadge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    rank: 3,
    name: 'Haripur Branch',
    location: 'Main Bazar, Haripur',
    manager: 'Sara Ahmed',
    ytdRevenue: 'Rs. 29.85 M',
    ytdProfit: 'Rs. 10.15 M',
    profitMargin: '34.0%',
    growthRate: '+16.8%',
    status: 'Stable Profit',
    statusBadge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    rank: 4,
    name: 'Taxilla Branch',
    location: 'GT Road, Taxilla',
    manager: 'Omar Sheikh',
    ytdRevenue: 'Rs. 25.10 M',
    ytdProfit: 'Rs. 8.78 M',
    profitMargin: '35.0%',
    growthRate: '+14.2%',
    status: 'Steady',
    statusBadge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
]

const PAGE_SIZE = 8

function RankBadge({ rank }) {
  return (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        rank === 1
          ? 'bg-amber-100 text-amber-800'
          : rank === 2
            ? 'bg-slate-200 text-slate-800'
            : rank === 3
              ? 'bg-amber-800/10 text-amber-900'
              : 'bg-slate-100 text-slate-600'
      }`}
    >
      {rank === 1 ? <Trophy className="size-3 text-amber-600" /> : rank}
    </span>
  )
}

export function BranchPerformanceRanking() {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(BRANCH_RANKINGS.length / PAGE_SIZE))

  const pagedRankings = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return BRANCH_RANKINGS.slice(start, start + PAGE_SIZE)
  }, [page])

  return (
    <SurfaceCard
      title="Branch Performance Ranking (YTD 2026)"
      description="Consolidated financial leaderboard ranking branches by revenue, profit generation & operational efficiency"
      actions={
        <span className="text-xs font-medium text-slate-400">
          {BRANCH_RANKINGS.length} records · {PAGE_SIZE} / page
        </span>
      }
    >
      <ResponsiveDataShell
        mobile={pagedRankings.map((b) => (
          <DataCard key={b.rank}>
            <div className="flex items-start gap-3">
              <RankBadge rank={b.rank} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-bold text-slate-900">{b.name}</p>
                  <Badge variant="outline" className={`shrink-0 ${b.statusBadge}`}>
                    {b.status}
                  </Badge>
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="size-3 shrink-0 text-slate-400" />
                  <span className="truncate">
                    {b.location} · Mgr: {b.manager}
                  </span>
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Revenue</span>
                    <p className="font-semibold text-slate-900">{b.ytdRevenue}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Profit</span>
                    <p className="font-bold text-purple-900">{b.ytdProfit}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Margin</span>
                    <p className="font-semibold text-emerald-700">{b.profitMargin}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Growth</span>
                    <p className="font-semibold text-slate-700">{b.growthRate}</p>
                  </div>
                </div>
              </div>
            </div>
          </DataCard>
        ))}
        desktop={
          <Table className="min-w-[36rem] text-left text-sm">
            <TableHeader>
              <TableRow className="text-xs tracking-wide text-slate-500 uppercase">
                <TableHead className="px-3 py-2.5 font-medium">Rank</TableHead>
                <TableHead className="px-3 py-2.5 font-medium">Branch Details</TableHead>
                <TableHead className="px-3 py-2.5 font-medium">YTD Revenue</TableHead>
                <TableHead className="hidden px-3 py-2.5 font-medium lg:table-cell">
                  YTD Net Profit
                </TableHead>
                <TableHead className="hidden px-3 py-2.5 font-medium xl:table-cell">
                  Profit Margin
                </TableHead>
                <TableHead className="px-3 py-2.5 text-right font-medium">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRankings.map((b) => (
                <TableRow key={b.rank} className="transition-colors hover:bg-slate-50/80">
                  <TableCell className="px-3 py-3">
                    <RankBadge rank={b.rank} />
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="font-bold text-slate-900">{b.name}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="size-3 text-slate-400" /> {b.location} · Mgr: {b.manager}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3 font-semibold text-slate-900">
                    {b.ytdRevenue}
                  </TableCell>
                  <TableCell className="hidden px-3 py-3 font-bold text-purple-900 lg:table-cell">
                    {b.ytdProfit}
                  </TableCell>
                  <TableCell className="hidden px-3 py-3 font-semibold text-emerald-700 xl:table-cell">
                    {b.profitMargin}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right">
                    <Badge variant="outline" className={b.statusBadge}>
                      {b.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
      />

      <TablePagination
        page={page}
        pageCount={totalPages}
        totalItems={BRANCH_RANKINGS.length}
        onPageChange={setPage}
      />
    </SurfaceCard>
  )
}
export default BranchPerformanceRanking
