type Props = {
  label: string;
  value: number;
  maxValue: number;
  suffix?: string;
};

export function ValueBar({ label, value, maxValue, suffix = "" }: Props) {
  const width = maxValue > 0 ? Math.max(6, (value / maxValue) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm text-muted">
        <span>{label}</span>
        <span className="font-medium text-ink">
          {value.toFixed(1)}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[rgba(17,17,27,0.06)]">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
