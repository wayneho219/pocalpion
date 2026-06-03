interface StatBarProps {
  label: string;
  value: number;
  maxValue?: number;
  color: string;
}

export function StatBar({ label, value, maxValue = 255, color }: StatBarProps) {
  const pct = Math.min(100, Math.round((value / maxValue) * 100));
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-10 text-[10px] font-bold uppercase tracking-wide text-white/35 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-[5px] bg-white/7 rounded-full overflow-hidden">
        <div
          data-testid="stat-bar-fill"
          style={{ width: `${pct}%`, background: color }}
          className="h-full rounded-full"
        />
      </div>
      <span className="w-7 text-right text-[13px] font-bold text-white">{value}</span>
    </div>
  );
}
