export function BarcodeCell({ value }) {
  if (!value) return <span className="text-xs text-slate-400">—</span>
  return (
    <span className="font-mono text-xs whitespace-nowrap text-slate-600" title={value}>
      {value}
    </span>
  )
}
