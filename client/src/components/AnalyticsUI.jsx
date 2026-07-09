"use client";

const RANGES = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
];

export function RangeTabs({ value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            value === r.value
              ? "bg-primary-500 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export function KpiTile({ label, value, accent = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
        {label}
      </p>
      <p className={`text-2xl font-black mt-1 ${accent}`}>{value}</p>
    </div>
  );
}

export function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="font-black text-gray-900 text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3.5 py-2.5 text-xs">
      {label && <p className="font-bold text-gray-700 mb-1">{label}</p>}
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: p.color || p.fill }}
          />
          <span className="text-gray-500 capitalize">{p.name}:</span>
          <span className="font-bold text-gray-800">
            {formatter ? formatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// Ordinal "meter" — a funnel/progress stage rendered as a bar, not a recharts
// chart. Fill and track are the same hue family (lighter step = unfilled),
// matching the app's existing progress-bar conventions elsewhere.
export function FunnelMeter({ label, value, total, colorClass = "bg-primary-500" }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-gray-600">{label}</span>
        <span className="font-bold text-gray-800">
          {value.toLocaleString()} <span className="text-gray-400 font-normal">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
