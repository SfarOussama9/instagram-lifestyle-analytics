"use client";

import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { AlertTriangle, Brain, ChevronRight, Flame, Heart, Users } from "lucide-react";

import { EChart } from "../../components/echart";
import { AnimatedCounter } from "../../components/animated-counter";
import { FadeIn, MotionDiv, StaggerChildren, staggerItemVariants } from "../../components/motion";
import { addVisualSpread, getValueExtent, pickHighlightedKeys } from "../../lib/scatter-helpers";
import {
  getAdvanced,
  getClusters,
  getModels,
  getOverview,
  type AdvancedPayload,
  type ClustersPayload,
  type ModelsPayload,
  type OverviewPayload,
} from "../../lib/api";

const PERSONA_EMOJI: Record<string, string> = {
  "The Doom Scroller": "📱",
  "The Aspiring Influencer": "⭐",
  "The Lurker": "👀",
  "The Social Butterfly": "🦋",
  "The Power User": "🚀",
  "The Healthy Casual": "🌿",
};

const PERSONA_ACCENT: Record<string, string> = {
  "The Doom Scroller": "#DD2A7B",
  "The Aspiring Influencer": "#F58529",
  "The Lurker": "#4FC3E8",
  "The Social Butterfly": "#8134AF",
  "The Power User": "#FFD4B5",
  "The Healthy Casual": "#55A868",
};

export default function InsightsPage() {
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [models, setModels] = useState<ModelsPayload | null>(null);
  const [advanced, setAdvanced] = useState<AdvancedPayload | null>(null);
  const [clusters, setClusters] = useState<ClustersPayload | null>(null);
  const [tickerIdx, setTickerIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [o, m, a, c] = await Promise.allSettled([
        getOverview(),
        getModels(),
        getAdvanced(),
        getClusters(),
      ]);
      if (cancelled) return;
      if (o.status === "fulfilled") setOverview(o.value);
      if (m.status === "fulfilled") setModels(m.value);
      if (a.status === "fulfilled") setAdvanced(a.value);
      if (c.status === "fulfilled") setClusters(c.value);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stressR2 =
    Number(models?.best_regression.find((r) => String(r.task) === "Perceived Stress Score")?.r2) || 0;
  const happinessR2 =
    Number(models?.best_regression.find((r) => String(r.task) === "Self-Reported Happiness")?.r2) || 0;
  const engagementR2 =
    Number(models?.best_regression.find((r) => String(r.task) === "User Engagement Score")?.r2) || 0;
  const addictionAuc = Number(models?.best_classification[0]?.roc_auc) || 0;

  const usageHappinessCorr = Number(advanced?.summary.usage_happiness_corr) || 0;
  const usageStressCorr = Number(advanced?.summary.usage_stress_corr) || 0;

  const tickerStats = useMemo(
    () => [
      {
        label: "Stress is predictable",
        value: `R² ${stressR2.toFixed(2)}`,
        hint: "Usage intensity drives most of the signal.",
      },
      {
        label: "Happiness is hard",
        value: `R² ${happinessR2.toFixed(2)}`,
        hint: "Subjective — models cap below behavior ceiling.",
      },
      {
        label: "Engagement is easy",
        value: `R² ${engagementR2.toFixed(2)}`,
        hint: "It's almost a direct aggregate of inputs.",
      },
      {
        label: "Addiction risk detectable",
        value: `AUC ${addictionAuc.toFixed(2)}`,
        hint: "Label is derived from the same features.",
      },
    ],
    [stressR2, happinessR2, engagementR2, addictionAuc],
  );

  useEffect(() => {
    const id = setInterval(() => setTickerIdx((i) => (i + 1) % tickerStats.length), 3800);
    return () => clearInterval(id);
  }, [tickerStats.length]);

  // Behavior × wellbeing scatter — uses country_analysis as bubble markers
  const scatter = (advanced?.country_analysis ?? []).slice(0, 20);
  const scatterMinutesExtent = getValueExtent(
    scatter.map((row) => Number(row.avg_minutes)),
    { minimumPad: 2, precision: 1 },
  );
  const scatterHappinessExtent = getValueExtent(
    scatter.map((row) => Number(row.avg_happiness)),
    { minimumPad: 0.25, precision: 2 },
  );
  const scatterPoints = addVisualSpread(
    scatter.map((row) => ({
      key: String(row.country),
      country: String(row.country),
      x: Number(row.avg_minutes),
      y: Number(row.avg_happiness),
      size: Number(row.avg_stress),
    })),
    Math.max(0.18, (scatterMinutesExtent.max - scatterMinutesExtent.min) * 0.014),
    Math.max(0.04, (scatterHappinessExtent.max - scatterHappinessExtent.min) * 0.012),
  );
  const highlightedScatterKeys = pickHighlightedKeys(scatterPoints, 5);
  const scatterData = scatterPoints.map((point) => ({
    name: point.country,
    country: point.country,
    stress: point.size,
    actualMinutes: point.x,
    actualHappiness: point.y,
    value: [point.plottedX, point.plottedY, point.size],
  }));
  const scatterOption: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 10, right: 10, top: 14, bottom: 40, containLabel: true },
    tooltip: {
      trigger: "item",
      formatter: (p: any) =>
        `<b>${String(p.data.country)}</b><br/>Minutes: ${Number(p.data.actualMinutes).toFixed(1)}<br/>Happiness: ${Number(p.data.actualHappiness).toFixed(2)}<br/>Stress: ${Number(p.data.stress).toFixed(2)}`,
    },
    xAxis: {
      type: "value",
      name: "Avg daily minutes",
      min: scatterMinutesExtent.min,
      max: scatterMinutesExtent.max,
      nameGap: 22,
      nameLocation: "middle",
      nameTextStyle: { color: "#7A7A88", fontSize: 10 },
      axisLabel: { color: "#7A7A88", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(17,17,27,0.05)" } },
    },
    yAxis: {
      type: "value",
      name: "Avg happiness",
      min: scatterHappinessExtent.min,
      max: scatterHappinessExtent.max,
      nameRotate: 90,
      nameGap: 30,
      nameLocation: "middle",
      nameTextStyle: { color: "#7A7A88", fontSize: 10 },
      axisLabel: { color: "#7A7A88", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(17,17,27,0.05)" } },
    },
    series: [
      {
        type: "scatter",
        symbolSize: (d: any) => 10 + (Number(d[2]) / 40) * 20,
        data: scatterData,
        itemStyle: {
          color: (p: any) => {
            const stress = Number(p.data.stress);
            const ratio = Math.min(1, stress / 40);
            return `rgba(${Math.round(79 + ratio * (221 - 79))}, ${Math.round(195 - ratio * 153)}, ${Math.round(232 - ratio * 109)}, 0.85)`;
          },
          borderColor: "#FFFFFF",
          borderWidth: 1.5,
        },
        emphasis: { scale: true },
      },
      {
        type: "scatter",
        data: scatterData.filter((point) => highlightedScatterKeys.has(point.country)),
        symbolSize: (d: any) => 12 + (Number(d[2]) / 40) * 20,
        itemStyle: {
          color: "rgba(221,42,123,0.92)",
          borderColor: "#FFFFFF",
          borderWidth: 2,
        },
        label: {
          show: true,
          position: "top",
          distance: 6,
          color: "#5C5C6B",
          fontSize: 10,
          backgroundColor: "rgba(255,255,255,0.88)",
          borderRadius: 999,
          padding: [3, 6],
          formatter: (p: any) => String(p.data.country),
        },
        labelLayout: { hideOverlap: true, moveOverlap: "shiftY" },
      },
    ],
  };

  const personaEntries = clusters
    ? Object.entries(clusters.share_by_persona).sort((a, b) => Number(b[1]) - Number(a[1]))
    : [];

  const modelLearnedCards = [
    {
      icon: <Flame className="h-5 w-5" />,
      title: "Daily minutes dominates everything",
      body: "Across all four targets, daily active minutes on Instagram sits in the top-3 permutation drivers. Models confirm what EDA suggested: intensity is the master variable.",
      tint: "#DD2A7B",
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "Sleep is the quiet counterweight",
      body: "Sleep hours consistently improves happiness predictions and pulls stress down. It's the clearest lever that isn't a usage variable.",
      tint: "#8134AF",
    },
    {
      icon: <AlertTriangle className="h-5 w-5" />,
      title: "Addiction risk is learnable, not discovered",
      body: `AUC of ${addictionAuc.toFixed(2)} sounds impressive — but the label is engineered from the features. Models re-derive the rule rather than discovering it in nature.`,
      tint: "#B02566",
    },
  ];

  const currentStat = tickerStats[tickerIdx];

  return (
    <div className="max-w-full space-y-12 overflow-x-hidden">
      {/* CHAPTER 1 — Opening scroll + rotating ticker */}
      <FadeIn>
        <div className="surface-panel relative overflow-hidden p-0">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF]" />
          <div className="grid gap-0 lg:grid-cols-[1.2fr,1fr]">
            <div className="px-6 py-10 sm:px-12 sm:py-14">
              <p className="eyebrow">Synthesis</p>
              <h1 className="font-display mt-4 text-5xl italic leading-[1.02] tracking-[-0.035em] text-ink sm:text-6xl">
                Four targets.
                <br />
                One <span className="ig-gradient-text">master variable</span>.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted">
                Scroll through the story — what the data says, what the models learned, and where the synthetic foundation makes every conclusion provisional.
              </p>

              {/* Rotating stat ticker */}
              <div className="mt-8 max-w-lg rounded-3xl border border-black/[0.05] bg-gradient-to-br from-white to-[rgba(245,133,41,0.06)] p-5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#B02566]">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#DD2A7B]" />
                  Rotating stat
                </div>
                <MotionDiv
                  key={tickerIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="mt-3 font-display text-3xl italic tracking-tight text-ink">
                    {currentStat.value}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">{currentStat.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{currentStat.hint}</p>
                </MotionDiv>
                <div className="mt-4 flex gap-1.5">
                  {tickerStats.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i === tickerIdx ? "bg-[#DD2A7B]" : "bg-[rgba(17,17,27,0.08)]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="relative min-h-[320px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/friends-suffering-from-social-media-addiction.jpg"
                alt="Friends dealing with social media addiction and stress"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(129,52,175,0.6)] via-[rgba(221,42,123,0.35)] to-[rgba(245,133,41,0.22)] mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/30 to-transparent lg:from-white lg:via-white/10" />
            </div>
          </div>
        </div>
      </FadeIn>

      {/* CHAPTER 2 — The central correlation */}
      <FadeIn>
        <div className="grid gap-6 xl:grid-cols-[1fr,1.3fr]">
          <div className="surface-panel p-7 sm:p-9">
            <p className="eyebrow" style={{ color: "#B02566" }}>
              Chapter 1
            </p>
            <h2 className="mt-3 font-display text-3xl italic leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
              Heavier usage, <span className="ig-gradient-text">consistently darker outcomes</span>.
            </h2>
            <p className="mt-5 text-sm leading-6 text-muted">
              Across countries, across cohorts, across personas — the correlation holds. Not causation — this is synthetic data — but the pattern is baked into every view.
            </p>
            <div className="mt-7 space-y-5">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-ink">Usage ↔ Stress</span>
                  <span className="font-display text-2xl italic tracking-tight text-ink">
                    <AnimatedCounter value={usageStressCorr} decimals={3} />
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[rgba(17,17,27,0.05)]">
                  <MotionDiv
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(100, Math.abs(usageStressCorr) * 140)}%` }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#F58529,#DD2A7B)" }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {usageStressCorr >= 0 ? "Positive" : "Negative"} — more usage, more stress.
                </p>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-ink">Usage ↔ Happiness</span>
                  <span className="font-display text-2xl italic tracking-tight text-ink">
                    <AnimatedCounter value={usageHappinessCorr} decimals={3} />
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[rgba(17,17,27,0.05)]">
                  <MotionDiv
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(100, Math.abs(usageHappinessCorr) * 140)}%` }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 1.2, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#8134AF,#4FC3E8)" }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {usageHappinessCorr >= 0 ? "Positive" : "Negative"} — more usage, less happiness.
                </p>
              </div>
            </div>
          </div>

          <div className="surface-panel p-7 sm:p-9">
            <p className="eyebrow">Bubbles are countries</p>
            <h3 className="mt-3 font-display text-2xl italic tracking-tight text-ink">
              Minutes vs happiness, tinted by stress
            </h3>
            <p className="mt-2 text-xs leading-5 text-muted">
              Size ∝ stress score. Warmer (pink) bubbles carry higher stress. Bubbles drift down-and-right as usage rises.
            </p>
            <div className="mt-5">
              <EChart option={scatterOption} height={340} />
            </div>
          </div>
        </div>
      </FadeIn>

      {/* CHAPTER 3 — Persona gallery (horizontal) */}
      <FadeIn>
        <div className="surface-panel p-7 sm:p-9">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow" style={{ color: "#8134AF" }}>
                Chapter 2
              </p>
              <h2 className="mt-3 font-display text-3xl italic tracking-[-0.03em] text-ink sm:text-4xl">
                <span className="ig-gradient-text">Six personas</span> emerge from the behavior
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                K-means carves the behavior space into six distinct lifestyles. Ordered by share.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted">
              <Users className="h-3.5 w-3.5" />
              scroll →
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {personaEntries.map(([name, share], i) => {
                const accent = PERSONA_ACCENT[name] ?? "#DD2A7B";
                return (
                  <MotionDiv
                    key={name}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="flex min-w-0 flex-col rounded-3xl border border-black/[0.05] bg-gradient-to-br from-white to-[rgba(245,133,41,0.04)] p-6 transition hover:-translate-y-1"
                    style={{ boxShadow: `inset 3px 0 0 0 ${accent}` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-5xl leading-none">{PERSONA_EMOJI[name] ?? "✨"}</div>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
                        style={{ backgroundColor: `${accent}18`, color: accent }}
                      >
                        {Number(share).toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-5 font-display text-xl italic tracking-tight text-ink">
                      {name}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(17,17,27,0.05)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Number(share) * 3)}%`,
                          backgroundColor: accent,
                        }}
                      />
                    </div>
                    <p className="mt-4 text-xs leading-5 text-muted">
                      {name === "The Doom Scroller" &&
                        "Highest daily minutes, elevated stress, lowest happiness. The cluster we want to understand most."}
                      {name === "The Aspiring Influencer" &&
                        "Creator-heavy behavior, high posts and comments, moderate wellness."}
                      {name === "The Lurker" &&
                        "Light usage, consumes without posting. Among the highest happiness scores."}
                      {name === "The Social Butterfly" &&
                        "Session-dense, high DMs and stories, middling stress."}
                      {name === "The Power User" &&
                        "Large follower counts, disciplined usage, top wellbeing."}
                      {name === "The Healthy Casual" &&
                        "Balanced profile across all dimensions — the ideal, and the rarest."}
                    </p>
                  </MotionDiv>
                );
              })}
          </div>
        </div>
      </FadeIn>

      {/* CHAPTER 4 — What the models learned */}
      <FadeIn>
        <div className="surface-panel p-7 sm:p-9">
          <p className="eyebrow" style={{ color: "#F58529" }}>
            Chapter 3
          </p>
          <h2 className="mt-3 font-display text-3xl italic tracking-[-0.03em] text-ink sm:text-4xl">
            Three things the <span className="ig-gradient-text">models learned</span>
          </h2>
          <StaggerChildren className="mt-7 grid gap-5 md:grid-cols-3" stagger={0.1}>
            {modelLearnedCards.map((c, i) => (
              <MotionDiv
                key={c.title}
                variants={staggerItemVariants}
                className="relative flex flex-col rounded-3xl border border-black/[0.05] bg-white p-6"
              >
                <div className="absolute inset-x-0 top-0 h-1 rounded-t-3xl" style={{ backgroundColor: c.tint }} />
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${c.tint}18`, color: c.tint }}
                >
                  {c.icon}
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: c.tint }}>
                  Finding {i + 1}
                </p>
                <p className="mt-2 font-display text-xl italic leading-tight tracking-tight text-ink">
                  {c.title}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">{c.body}</p>
              </MotionDiv>
            ))}
          </StaggerChildren>
        </div>
      </FadeIn>

      {/* CHAPTER 5 — Limitations (dark element) */}
      <FadeIn>
        <div className="relative overflow-hidden rounded-[36px] bg-[#141420] p-8 text-white sm:p-12">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[rgba(221,42,123,0.25)] blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[rgba(129,52,175,0.25)] blur-3xl" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#FFD4B5]">
              Honest caveats
            </p>
            <h2 className="font-display mt-4 text-4xl italic leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">
              Synthetic data.
              <br />
              <span className="ig-gradient-text">Real lessons, fake numbers.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">
              Every finding above is contingent on the data-generation process. Marginal distributions look uniform on purpose — the synthetic generator was engineered for balance. The correlations, personas, and model rankings reflect <span className="font-semibold text-white">how the data was built</span>, not how real Instagram users behave.
            </p>
            <StaggerChildren className="mt-8 grid gap-4 md:grid-cols-3" stagger={0.1}>
              {[
                {
                  title: "Correlation, not causation",
                  body: "Heavier usage aligns with lower happiness — but the arrow of causality is not identifiable here.",
                },
                {
                  title: "Engineered labels",
                  body: "Addiction risk is rule-derived from the same features. High AUC is a reconstruction, not a discovery.",
                },
                {
                  title: "Near-uniform marginals",
                  body: "Countries, gender, income all look flat. The story lives in the cohort interactions, not the margins.",
                },
              ].map((c) => (
                <MotionDiv
                  key={c.title}
                  variants={staggerItemVariants}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                >
                  <p className="text-sm font-semibold text-white">{c.title}</p>
                  <p className="mt-2 text-xs leading-5 text-white/70">{c.body}</p>
                </MotionDiv>
              ))}
            </StaggerChildren>
          </div>
        </div>
      </FadeIn>

      {/* CLOSING */}
      <FadeIn>
        <div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
          <Heart className="h-5 w-5 text-[#DD2A7B]" />
          <p className="max-w-xl text-sm leading-6 text-muted">
            Built as a portfolio project — exploratory, interactive, and honest about its synthetic roots. Try the{" "}
            <a href="/predict" className="font-semibold text-ink underline-offset-4 hover:underline">
              live predictor
            </a>{" "}
            or upload your own CSV in{" "}
            <a href="/automl" className="font-semibold text-ink underline-offset-4 hover:underline">
              AutoML
            </a>
            .
          </p>
          <ChevronRight className="h-4 w-4 rotate-90 text-muted" />
        </div>
      </FadeIn>
    </div>
  );
}
