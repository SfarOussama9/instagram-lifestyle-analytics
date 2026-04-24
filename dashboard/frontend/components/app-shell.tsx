"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  BarChart3,
  BrainCircuit,
  Compass,
  Database,
  Gauge,
  Info,
  LayoutDashboard,
  LineChart,
  Sparkles,
} from "lucide-react";

import { getStatus, type StatusPayload } from "../lib/api";
import { StatusPill } from "./status-pill";

const mainItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/eda", label: "EDA", icon: BarChart3 },
  { href: "/personas", label: "Personas", icon: Compass },
  { href: "/advanced", label: "Advanced", icon: LineChart },
];

const labItems = [
  { href: "/automl", label: "AutoML", icon: Database },
  { href: "/models", label: "Models", icon: BrainCircuit },
  { href: "/predict", label: "Predict", icon: Gauge },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/about", label: "About", icon: Info },
];

const allItems = [...mainItems, ...labItems];

const FALLBACK_STATUS: StatusPayload = {
  ready: false,
  stage: "unknown",
  progress: 0,
  message: "Checking backend status...",
};

type Props = {
  children: React.ReactNode;
};

export function AppShell({ children }: Props) {
  const pathname = usePathname();
  const [status, setStatus] = useState<StatusPayload>(FALLBACK_STATUS);
  const activeItem = allItems.find((item) => item.href === pathname) ?? allItems[0];

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 100, 160], [1, 0.6, 0]);
  const heroScale = useTransform(scrollY, [0, 160], [1, 0.96]);
  const heroHeight = useTransform(scrollY, [0, 160], ["auto" as unknown as number, 0 as unknown as number]);
  const heroMarginBottom = useTransform(scrollY, [0, 160], [0, -24]);
  const compactOpacity = useTransform(scrollY, [80, 140], [0, 1]);
  const compactY = useTransform(scrollY, [80, 140], [-12, 0]);
  const compactPointer = useTransform(scrollY, (latest) => (latest > 100 ? "auto" : "none"));

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const nextStatus = await getStatus();
        if (!cancelled) {
          startTransition(() => setStatus(nextStatus));
        }
      } catch {
        if (!cancelled) {
          startTransition(() => setStatus(FALLBACK_STATUS));
        }
      }
    }

    void loadStatus();
    const interval = window.setInterval(() => {
      void loadStatus();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[1760px] overflow-x-hidden px-4 py-4 sm:px-6 lg:px-10 lg:py-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-8%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(245,133,41,0.22),transparent_68%)] blur-3xl" />
        <div className="absolute right-[-8%] top-[12%] h-[440px] w-[440px] rounded-full bg-[radial-gradient(circle,rgba(221,42,123,0.18),transparent_68%)] blur-3xl" />
        <div className="absolute bottom-[-12%] left-[28%] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(129,52,175,0.14),transparent_68%)] blur-3xl" />
      </div>

      {/* Compact sticky bar — fades in after 100px scroll */}
      <motion.div
        style={{ opacity: compactOpacity, y: compactY, pointerEvents: compactPointer as unknown as "auto" | "none" }}
        className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.05] bg-white/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex w-full max-w-[1760px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ig-gradient-bg text-white shadow-[0_8px_20px_-10px_rgba(221,42,123,0.5)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">Lifestyle &amp; Well-Being</p>
            <p className="truncate text-sm font-semibold text-ink">{activeItem.label}</p>
          </div>
          <div className="hidden items-center gap-1 md:flex">
            {allItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  aria-label={label}
                  className={`rounded-full p-2 transition ${
                    active ? "ig-gradient-bg text-white" : "text-muted hover:bg-[rgba(221,42,123,0.08)] hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </div>
          <div className="hidden lg:block">
            <div className="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/90 px-3 py-1.5 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  status.ready ? "bg-[#22C55E]" : "animate-pulse bg-[#DD2A7B]"
                }`}
              />
              <span className="font-semibold uppercase tracking-[0.18em] text-ink">
                {status.ready ? "Ready" : "Training"}
              </span>
              <span className="text-muted">{Math.round(status.progress * 100)}%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Full hero — shrinks to 0 as user scrolls */}
      <motion.header
        style={{ opacity: heroOpacity, scale: heroScale, marginBottom: heroMarginBottom }}
        className="origin-top"
      >
        <div className="shell-panel relative flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl ig-gradient-bg text-white shadow-[0_10px_24px_-10px_rgba(221,42,123,0.5)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="eyebrow">Instagram Users Lifestyle Dataset</p>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <h1 className="font-display text-3xl italic tracking-[-0.04em] text-ink sm:text-4xl lg:text-[3rem]">
                Lifestyle &amp; Well-Being <span className="ig-gradient-text">Analytics</span>
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted sm:text-base">
                Exploratory analysis, user segmentation, and predictive modeling of self-reported happiness, stress, and engagement.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em]">
              <span className="rounded-full border border-[rgba(245,133,41,0.25)] bg-[rgba(245,133,41,0.10)] px-3 py-1.5 text-[#C56A1E]">EDA</span>
              <span className="rounded-full border border-[rgba(221,42,123,0.25)] bg-[rgba(221,42,123,0.10)] px-3 py-1.5 text-[#B02566]">Personas</span>
              <span className="rounded-full border border-[rgba(129,52,175,0.25)] bg-[rgba(129,52,175,0.10)] px-3 py-1.5 text-[#6A2B8F]">AutoML</span>
              <span className="rounded-full border border-[rgba(79,195,232,0.35)] bg-[rgba(79,195,232,0.12)] px-3 py-1.5 text-[#2B7E9A]">Predictions</span>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-stretch gap-3 lg:items-end">
            <StatusPill {...status} />
          </div>
        </div>
      </motion.header>

      <div className="mt-5 flex gap-5 lg:gap-8">
        <aside className="sticky top-20 hidden h-fit w-[220px] shrink-0 lg:block">
          <nav className="rail-panel flex flex-col gap-1 p-4">
            <div className="flex items-center gap-2 px-2 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl ig-gradient-bg text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-ink">Lifestyle</span>
                <span className="text-[10px] uppercase tracking-[0.24em] text-muted">Analytics</span>
              </div>
            </div>
            <p className="px-2 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">Main menu</p>
            {mainItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "ig-gradient-bg text-white shadow-[0_14px_30px_-14px_rgba(221,42,123,0.55)]"
                      : "text-inkSoft hover:bg-[rgba(221,42,123,0.06)] hover:text-ink"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-white" : "text-muted group-hover:text-[#DD2A7B]"}`} />
                  <span>{label}</span>
                </Link>
              );
            })}
            <p className="px-2 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">Lab</p>
            {labItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "ig-gradient-bg text-white shadow-[0_14px_30px_-14px_rgba(221,42,123,0.55)]"
                      : "text-inkSoft hover:bg-[rgba(221,42,123,0.06)] hover:text-ink"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-white" : "text-muted group-hover:text-[#DD2A7B]"}`} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-16">
          <div className="mb-4 flex items-center justify-between rounded-[24px] border border-black/[0.06] bg-white/80 px-4 py-3 text-sm backdrop-blur-xl lg:hidden">
            <div>
              <p className="eyebrow">Current section</p>
              <p className="mt-2 text-base font-semibold text-ink">{activeItem.label}</p>
            </div>
            <div className="rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-muted">
              {status.ready ? "ready" : activeItem.label}
            </div>
          </div>
          <div className="page-grid">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
        <div className="rail-panel flex items-center justify-between gap-1 p-2">
          {allItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                aria-label={label}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium uppercase tracking-[0.18em] transition ${
                  active ? "ig-gradient-bg text-white" : "text-muted hover:bg-[rgba(221,42,123,0.06)] hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
