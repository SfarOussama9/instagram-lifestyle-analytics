"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { EChartsOption } from "echarts";
import { ArrowUpRight, Flame, Globe2, Heart, Sparkles, TrendingDown, Users } from "lucide-react";

import { EChart } from "../components/echart";
import { AnimatedCounter } from "../components/animated-counter";
import { FadeIn, MotionDiv, StaggerChildren, staggerItemVariants } from "../components/motion";
import { getClusters, getOverview, type ClustersPayload, type OverviewPayload } from "../lib/api";

const PERSONA_META: Record<string, { emoji: string; tagline: string; tint: string; textColor: string }> = {
  "The Doom Scroller": {
    emoji: "📱",
    tagline: "High usage, high stress",
    tint: "from-[#DD2A7B]/22 to-[#8134AF]/22",
    textColor: "#B02566",
  },
  "The Aspiring Influencer": {
    emoji: "⭐",
    tagline: "Creator energy, moderate usage",
    tint: "from-[#F58529]/22 to-[#DD2A7B]/18",
    textColor: "#C56A1E",
  },
  "The Lurker": {
    emoji: "👀",
    tagline: "Light usage, high happiness",
    tint: "from-[#4FC3E8]/22 to-[#8134AF]/14",
    textColor: "#2B7E9A",
  },
  "The Social Butterfly": {
    emoji: "🦋",
    tagline: "Session-heavy, socially dense",
    tint: "from-[#8134AF]/22 to-[#4FC3E8]/18",
    textColor: "#6A2B8F",
  },
  "The Power User": {
    emoji: "🚀",
    tagline: "Minimal usage, top wellbeing",
    tint: "from-[#FFD4B5]/55 to-[#F58529]/18",
    textColor: "#C56A1E",
  },
  "The Healthy Casual": {
    emoji: "🌿",
    tagline: "Balanced profile",
    tint: "from-[#55A868]/22 to-[#4FC3E8]/14",
    textColor: "#2E7D5B",
  },
};

const OUTCOME_BLURBS: Record<string, string> = {
  self_reported_happiness:
    "Subjective well-being on a 1-10 scale. The hardest of the three targets to predict — blends demographics, health, and social context.",
  perceived_stress_score:
    "Clinical-style stress proxy (0-40). Tightly coupled to daily usage intensity and addiction risk.",
  user_engagement_score:
    "Composite of platform activity. The easiest target — near-direct aggregation of behavioral features.",
};

const OUTCOME_LABELS: Record<string, string> = {
  self_reported_happiness: "Happiness",
  perceived_stress_score: "Stress",
  user_engagement_score: "Engagement",
};

const FEATURED_IMAGES = [
  {
    href: "/eda",
    label: "Exploratory Analysis",
    blurb: "Instagram demographics, daily-use cohorts, and content preferences at scale.",
    img: "/bg/hero-lifestyle.jpg",
    tint: "from-[rgba(245,133,41,0.55)] to-[rgba(221,42,123,0.25)]",
  },
  {
    href: "/models",
    label: "Predictive Modeling",
    blurb: "Stress, happiness, engagement, and addiction-risk models built around Instagram behavior.",
    img: "/images/friends-suffering-from-social-media-addiction.jpg",
    tint: "from-[rgba(129,52,175,0.55)] to-[rgba(79,195,232,0.30)]",
  },
  {
    href: "/predict",
    label: "Live Predictions",
    blurb: "Score an Instagram user profile in real time and surface the strongest drivers of wellbeing risk.",
    img: "/images/cool-teen-young-woman-pink-hoodie-stylish-sunglasses-takes-selfie-holds-phone-poses-with-headphones-outside.jpg",
    tint: "from-[rgba(221,42,123,0.55)] to-[rgba(245,133,41,0.30)]",
  },
];

export default function HomePage() {
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [clusters, setClusters] = useState<ClustersPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [ov, cl] = await Promise.all([getOverview(), getClusters().catch(() => null)]);
        if (!cancelled) {
          setOverview(ov);
          setClusters(cl);
        }
      } catch {
        if (!cancelled) setOverview(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const targetEntries = overview
    ? Object.entries(overview.targets).map(([target, stats]) => ({
        target,
        label: OUTCOME_LABELS[target] ?? target.replaceAll("_", " "),
        mean: Number(stats.mean ?? 0),
        std: Number(stats.std ?? 0),
        min: Number(stats.min ?? 0),
        max: Number(stats.max ?? 0),
        blurb: OUTCOME_BLURBS[target] ?? "",
      }))
    : [];

  const personaShare = clusters?.share_by_persona ?? {};
  const personaRanked = Object.entries(personaShare)
    .map(([name, share]) => ({
      name,
      share: Number(share) || 0,
      meta:
        PERSONA_META[name] ?? {
          emoji: "✨",
          tagline: "",
          tint: "from-[#FFD4B5]/40 to-white",
          textColor: "#141420",
        },
    }))
    .sort((a, b) => b.share - a.share);

  return (
    <div className="max-w-full space-y-10 overflow-x-hidden">
      {/* HERO */}
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        className="surface-panel overflow-hidden p-0"
      >
        <div className="grid gap-0 lg:grid-cols-[1.25fr,1fr]">
          <div className="relative px-6 py-8 sm:px-10 sm:py-11">
            <p className="eyebrow">Overview</p>
            <h1 className="font-display mt-4 text-4xl italic leading-[1.05] tracking-[-0.04em] text-ink sm:text-[2.75rem] lg:text-[3.25rem]">
              A behavioral portrait of{" "}
              <span className="ig-gradient-text">1.5M simulated</span> Instagram users.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
              Demographics, health habits, and on-platform activity joined to three outcomes — happiness, stress, and engagement — plus a derived addiction-risk flag. This page surfaces the headline patterns, the six behavioral personas, and the best model per target.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-xs">
              <Link
                href="/eda"
                className="group inline-flex items-center gap-2 rounded-full ig-gradient-bg px-4 py-2.5 font-semibold uppercase tracking-[0.2em] text-white shadow-[0_14px_30px_-14px_rgba(221,42,123,0.55)] transition hover:scale-[1.02]"
              >
                Explore the data
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                href="/models"
                className="group inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2.5 font-semibold uppercase tracking-[0.2em] text-ink transition hover:border-[rgba(221,42,123,0.35)] hover:text-[#B02566]"
              >
                See model results
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
          <div className="relative min-h-[240px] overflow-hidden lg:min-h-[380px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bg/hero-lifestyle.jpg"
              alt="Young person resting on books while scrolling on a smartphone"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(129,52,175,0.55)] via-[rgba(221,42,123,0.35)] to-[rgba(245,133,41,0.25)] mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent lg:bg-gradient-to-r lg:from-white lg:via-white/20 lg:to-transparent" />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: -4 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 180, damping: 14 }}
              className="absolute bottom-6 right-6 rounded-2xl border border-white/60 bg-white/92 px-4 py-3 text-left shadow-[0_18px_40px_-18px_rgba(17,17,27,0.35)] backdrop-blur-md"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#B02566]">Snapshot</p>
              <p className="mt-1 font-display text-lg italic tracking-tight text-ink">1.5M · 58 · 6</p>
              <p className="text-[11px] leading-4 text-muted">users · features · personas</p>
            </MotionDiv>
          </div>
        </div>
      </MotionDiv>

      {/* MOSAIC KPIs */}
      <StaggerChildren className="grid auto-rows-[minmax(150px,auto)] gap-4 md:grid-cols-6">
        <MotionDiv
          variants={staggerItemVariants}
          className="surface-panel md:col-span-3 md:row-span-2 relative overflow-hidden p-7"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF]" />
          <div className="absolute right-6 top-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(221,42,123,0.12)] text-[#B02566]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="eyebrow">Users analyzed</p>
          <div className="mt-5">
            <AnimatedCounter
              value={overview?.rows ?? 0}
              className="font-display text-[3.5rem] italic leading-none tracking-[-0.04em] text-ink sm:text-[4.5rem]"
            />
            <p className="mt-3 text-sm leading-6 text-muted">
              Rows in the active modeling sample. The source is ~1.5M; we train on a stratified subset for responsiveness.
            </p>
          </div>
          <div className="mt-6 flex items-end gap-1.5">
            {targetEntries.map((t, i) => {
              const heights = [44, 68, 52];
              const colors = ["#F58529", "#DD2A7B", "#8134AF"];
              return (
                <MotionDiv
                  key={t.target}
                  initial={{ height: 0 }}
                  animate={{ height: heights[i] ?? 40 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                  className="flex-1 rounded-t-lg"
                  style={{ backgroundColor: colors[i] ?? "#DD2A7B", maxWidth: 36 }}
                />
              );
            })}
            <div className="ml-3 self-end text-[10px] uppercase tracking-[0.2em] text-muted">Target means</div>
          </div>
        </MotionDiv>

        <MotionDiv variants={staggerItemVariants} className="surface-panel md:col-span-3 relative overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[rgba(17,17,27,0.06)]" />
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Features</p>
              <div className="metric-value mt-3 text-3xl font-semibold tracking-[-0.05em] text-ink sm:text-4xl">
                <AnimatedCounter value={overview?.columns ?? 0} />
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(79,195,232,0.14)] text-[#2B7E9A]">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">Raw + engineered variables combined — 23 added via notebook feature engineering.</p>
        </MotionDiv>

        <MotionDiv variants={staggerItemVariants} className="surface-panel md:col-span-2 relative overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[rgba(17,17,27,0.06)]" />
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Countries</p>
              <div className="metric-value mt-3 text-3xl font-semibold tracking-[-0.05em] text-ink sm:text-4xl">
                <AnimatedCounter value={overview?.countries ?? 0} />
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(129,52,175,0.14)] text-[#6A2B8F]">
              <Globe2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">Geographic spread</p>
        </MotionDiv>

        <MotionDiv variants={staggerItemVariants} className="surface-panel md:col-span-2 relative overflow-hidden p-6">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(17,17,27,0.06)" strokeWidth="4" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="url(#riskGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${((overview?.high_addiction_risk_rate ?? 0) / 100) * 100.53} 100.53`}
                />
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F58529" />
                    <stop offset="100%" stopColor="#DD2A7B" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-ink">
                <AnimatedCounter value={overview?.high_addiction_risk_rate ?? 0} decimals={0} suffix="%" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="eyebrow">High-risk</p>
              <p className="mt-2 text-sm leading-5 text-muted">Users at or above the addiction-risk threshold.</p>
            </div>
          </div>
        </MotionDiv>

        <MotionDiv variants={staggerItemVariants} className="surface-panel md:col-span-2 relative overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#DD2A7B] to-[#8134AF]" />
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Daily minutes</p>
              <div className="metric-value mt-3 text-3xl font-semibold tracking-[-0.05em] text-ink sm:text-4xl">
                <AnimatedCounter value={overview?.avg_daily_minutes ?? 0} decimals={1} />
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(245,133,41,0.14)] text-[#C56A1E]">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">Strongest behavioral intensity signal.</p>
        </MotionDiv>

        <MotionDiv variants={staggerItemVariants} className="surface-panel md:col-span-2 relative overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[rgba(17,17,27,0.06)]" />
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Avg. happiness</p>
              <div className="metric-value mt-3 text-3xl font-semibold tracking-[-0.05em] text-ink sm:text-4xl">
                <AnimatedCounter value={overview?.avg_happiness ?? 0} decimals={2} />
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(85,168,104,0.14)] text-[#2E7D5B]">
              <Heart className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">Self-reported well-being (1-10).</p>
        </MotionDiv>
      </StaggerChildren>

      {/* THREE OUTCOMES */}
      <FadeIn>
        <div className="surface-panel p-7 sm:p-9">
          <div>
            <p className="eyebrow">Target outcomes</p>
            <h2 className="mt-3 font-display text-3xl italic tracking-[-0.03em] text-ink sm:text-4xl">
              Three <span className="ig-gradient-text">outcomes</span> we predict
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Each target is modeled independently. The distributions below are computed on the training sample.
            </p>
          </div>
          <StaggerChildren className="mt-6 grid gap-4 md:grid-cols-3" stagger={0.12}>
            {targetEntries.map((t, i) => {
              const colors = ["#DD2A7B", "#8134AF", "#F58529"];
              const color = colors[i] ?? "#DD2A7B";
              const option: EChartsOption = {
                backgroundColor: "transparent",
                grid: { left: 4, right: 4, top: 10, bottom: 10, containLabel: false },
                xAxis: { type: "value", show: false, min: t.min, max: t.max },
                yAxis: { type: "category", show: false, data: [""] },
                tooltip: { show: false },
                series: [
                  {
                    type: "boxplot",
                    data: [[t.min, Math.max(t.min, t.mean - t.std), t.mean, Math.min(t.max, t.mean + t.std), t.max]],
                    itemStyle: { color: `${color}22`, borderColor: color, borderWidth: 2 },
                  },
                  {
                    type: "scatter",
                    data: [[t.mean, 0]],
                    symbolSize: 10,
                    itemStyle: { color },
                  },
                ],
              };
              return (
                <MotionDiv
                  key={t.target}
                  variants={staggerItemVariants}
                  className="relative flex flex-col rounded-[22px] border border-black/[0.05] bg-gradient-to-br from-white to-[rgba(245,133,41,0.05)] p-5 transition hover:border-[rgba(221,42,123,0.2)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color }}>
                        {t.label}
                      </p>
                      <p className="font-display mt-2 text-[2.5rem] italic leading-none tracking-tight text-ink">
                        {t.mean.toFixed(2)}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted">mean</p>
                    </div>
                    <div className="text-right text-[10px] uppercase tracking-[0.2em] text-muted">
                      <p>±{t.std.toFixed(2)}</p>
                      <p className="mt-1">
                        {t.min.toFixed(1)}–{t.max.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-10">
                    <EChart option={option} height={40} />
                  </div>
                  <p className="mt-3 text-[12px] leading-5 text-muted">{t.blurb}</p>
                </MotionDiv>
              );
            })}
          </StaggerChildren>
        </div>
      </FadeIn>

      {/* PERSONAS */}
      <FadeIn>
        <div className="surface-panel p-7 sm:p-9">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Behavioral clusters</p>
              <h2 className="mt-3 font-display text-3xl italic tracking-[-0.03em] text-ink sm:text-4xl">
                Meet the <span className="ig-gradient-text">six personas</span>
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                K-means on 17 usage, social, and wellbeing features. Share reflects % of users.
              </p>
            </div>
            <Link
              href="/personas"
              className="group inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink transition hover:border-[rgba(221,42,123,0.35)] hover:text-[#B02566]"
            >
              See personas
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          <StaggerChildren className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" stagger={0.07}>
            {personaRanked.length > 0
              ? personaRanked.map((p) => (
                  <MotionDiv
                    key={p.name}
                    variants={staggerItemVariants}
                    className={`group relative flex flex-col items-center rounded-3xl border border-black/[0.05] bg-gradient-to-br ${p.meta.tint} to-white p-5 text-center transition hover:-translate-y-1 hover:border-[rgba(221,42,123,0.2)]`}
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white bg-white text-3xl shadow-[0_10px_24px_-10px_rgba(17,17,27,0.15)]">
                      {p.meta.emoji}
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: p.meta.textColor }}>
                      {p.share.toFixed(1)}%
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-tight text-ink">{p.name.replace("The ", "")}</p>
                    <p className="mt-1 text-[11px] leading-4 text-muted">{p.meta.tagline}</p>
                  </MotionDiv>
                ))
              : Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-3xl bg-[rgba(17,17,27,0.04)]" />
                ))}
          </StaggerChildren>
        </div>
      </FadeIn>

      {/* FEATURED IMAGERY */}
      <FadeIn>
        <StaggerChildren className="grid gap-4 md:grid-cols-3" stagger={0.1}>
          {FEATURED_IMAGES.map((f) => (
            <MotionDiv key={f.href} variants={staggerItemVariants}>
              <Link
                href={f.href}
                className="group relative block h-[260px] overflow-hidden rounded-3xl border border-black/[0.05] transition hover:-translate-y-1"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.img}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className={`absolute inset-0 bg-gradient-to-tr ${f.tint} mix-blend-multiply`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] opacity-90">Jump to</p>
                  <p className="mt-1 font-display text-xl italic tracking-tight">{f.label}</p>
                  <p className="mt-1 text-xs leading-5 opacity-85">{f.blurb}</p>
                </div>
                <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </Link>
            </MotionDiv>
          ))}
        </StaggerChildren>
      </FadeIn>

      <FadeIn>
        <div className="flex items-center justify-center gap-3 py-4 text-sm text-muted">
          <TrendingDown className="h-4 w-4" />
          <p>
            Heavier usage <span className="font-semibold text-ink">consistently</span> aligns with lower happiness and higher stress in this synthetic sample.
          </p>
        </div>
      </FadeIn>
    </div>
  );
}