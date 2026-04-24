type Props = {
  ready: boolean;
  stage: string;
  progress: number;
  message: string;
};

export function StatusPill({ ready, stage, progress, message }: Props) {
  return (
    <div className="min-w-[260px] rounded-[22px] border border-black/[0.06] bg-white/90 px-4 py-3 text-sm shadow-[0_8px_28px_-18px_rgba(17,17,27,0.25)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${ready ? "bg-[#22C55E] shadow-[0_0_0_4px_rgba(34,197,94,0.18)]" : "animate-pulse bg-[#DD2A7B] shadow-[0_0_0_4px_rgba(221,42,123,0.18)]"}`} />
        <span className="font-semibold uppercase tracking-[0.2em] text-ink">
          {ready ? "Models ready" : stage.replaceAll("_", " ")}
        </span>
        <span className="metric-value ml-auto text-muted">{Math.round(progress * 100)}%</span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{message}</p>
      {!ready ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(17,17,27,0.06)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] transition-all duration-500"
            style={{ width: `${Math.max(progress * 100, 8)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
