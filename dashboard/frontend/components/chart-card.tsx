import clsx from "clsx";
import { ReactNode } from "react";

type Props = {
  title: string;
  eyebrow: string;
  description?: string;
  className?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function ChartCard({ title, eyebrow, description, className, action, children }: Props) {
  return (
    <section className={clsx("surface-panel p-6 sm:p-7", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="relative z-10">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">{title}</h2>
          {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
        </div>
        {action ? <div className="relative z-10 shrink-0">{action}</div> : null}
      </div>
      <div className="relative z-10 mt-6">{children}</div>
    </section>
  );
}
