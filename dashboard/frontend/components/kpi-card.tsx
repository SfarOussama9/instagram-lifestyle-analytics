import clsx from "clsx";

type Props = {
  label: string;
  value: string;
  note: string;
  accent?: "acid" | "lilac" | "neutral";
};

// `acid` maps to Instagram pink, `lilac` to Instagram purple.
// Names preserved for compatibility with existing page usage.
export function KpiCard({ label, value, note, accent = "neutral" }: Props) {
  return (
    <div className="surface-panel min-w-0 p-5 sm:p-6">
      <div
        className={clsx("absolute inset-x-0 top-0 h-1", {
          "bg-gradient-to-r from-[#F58529] to-[#DD2A7B]": accent === "acid",
          "bg-gradient-to-r from-[#DD2A7B] to-[#8134AF]": accent === "lilac",
          "bg-[rgba(17,17,27,0.06)]": accent === "neutral",
        })}
      />
      <div className="absolute right-5 top-5">
        <span
          className={clsx("flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold", {
            "bg-[rgba(245,133,41,0.14)] text-[#C56A1E]": accent === "acid",
            "bg-[rgba(129,52,175,0.14)] text-[#6A2B8F]": accent === "lilac",
            "bg-[rgba(17,17,27,0.04)] text-muted": accent === "neutral",
          })}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
        </span>
      </div>
      <div className="relative z-10">
        <p className="eyebrow">{label}</p>
        <p className="metric-value mt-5 text-3xl font-semibold tracking-[-0.05em] text-ink sm:text-4xl">{value}</p>
        <p className="mt-3 text-sm leading-6 text-muted">{note}</p>
      </div>
    </div>
  );
}
