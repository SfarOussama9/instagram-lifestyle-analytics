"use client";

import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { CheckCircle2, Crown, Trophy, Zap } from "lucide-react";

import { ChartCard } from "../../components/chart-card";
import { EChart } from "../../components/echart";
import { FadeIn, MotionDiv, StaggerChildren, staggerItemVariants } from "../../components/motion";
import { AnimatedCounter } from "../../components/animated-counter";
import { HEATMAP_RANGE_IG } from "../../lib/chart-theme";
import {
  getFeatureImportance,
  getModels,
  type FeatureImportancePayload,
  type ModelsPayload,
} from "../../lib/api";

type TargetKey =
  | "Self-Reported Happiness"
  | "Perceived Stress Score"
  | "User Engagement Score"
  | "Social Media Addiction Risk";

type TargetMeta = {
  key: TargetKey;
  short: string;
  kind: "regression" | "classification";
  metric: "r2" | "roc_auc";
  metricLabel: string;
  color: string;
  blurb: string;
  whyHard: string;
  whyWon: string;
};

const TARGETS: TargetMeta[] = [
  {
    key: "Self-Reported Happiness",
    short: "Happiness",
    kind: "regression",
    metric: "r2",
    metricLabel: "R²",
    color: "#F58529",
    blurb: "1-10 self-report. The most subjective of the four — depends on lifestyle, social context, and mood, not just usage.",
    whyHard:
      "Happiness is driven by latent factors (relationships, sleep, health) that are only partially observed. Behavioral data alone caps the ceiling around R² 0.60.",
    whyWon:
      "HistGradientBoosting captures non-linear interactions (sleep × usage, exercise × stress) that linear models and a shallower Random Forest miss.",
  },
  {
    key: "Perceived Stress Score",
    short: "Stress",
    kind: "regression",
    metric: "r2",
    metricLabel: "R²",
    color: "#DD2A7B",
    blurb: "0-40 proxy score. Tightly coupled to usage intensity and sleep deprivation.",
    whyHard:
      "Easier than happiness — stress correlates more directly with measurable behavior (daily minutes, notification rate, session count).",
    whyWon:
      "Boosting exploits the monotonic rise of stress with usage plus sharp breakpoints above ~180 daily minutes.",
  },
  {
    key: "User Engagement Score",
    short: "Engagement",
    kind: "regression",
    metric: "r2",
    metricLabel: "R²",
    color: "#8134AF",
    blurb: "Composite of likes, comments, posts, sessions. Near-direct aggregation of inputs.",
    whyHard:
      "The easiest target — engagement is a deterministic blend of features we already observe, so even linear models score well.",
    whyWon:
      "Boosting wins by a small margin — Ridge is close behind. The feature space is already very informative for this target.",
  },
  {
    key: "Social Media Addiction Risk",
    short: "Addiction risk",
    kind: "classification",
    metric: "roc_auc",
    metricLabel: "ROC AUC",
    color: "#B02566",
    blurb: "Binary flag at addiction-risk-score ≥ 50. Engineered from usage patterns.",
    whyHard:
      "Not actually hard — the label is derived from the same feature family we train on, so models can nearly reconstruct the rule.",
    whyWon:
      "HistGradientBoosting Classifier clears AUC 0.92 by learning the exact thresholds. Any gradient-boosted tree wins here.",
  },
];

const COLORS_BY_MODEL: Record<string, string> = {
  "Linear Regression": "#4FC3E8",
  "Ridge Regression": "#BEE6F2",
  "Random Forest Regressor": "#F58529",
  "HistGradientBoosting Regressor": "#DD2A7B",
  "Logistic Regression": "#4FC3E8",
  "Random Forest Classifier": "#F58529",
  "HistGradientBoosting Classifier": "#DD2A7B",
};

function formatMetric(v: number | undefined, digits = 3) {
  if (v === undefined || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelsPayload | null>(null);
  const [importances, setImportances] = useState<FeatureImportancePayload[]>([]);
  const [activeTarget, setActiveTarget] = useState<TargetKey>("Self-Reported Happiness");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [m, imp] = await Promise.all([
        getModels(),
        Promise.all(TARGETS.map((t) => getFeatureImportance(t.key))),
      ]);
      if (!cancelled) {
        setModels(m);
        setImportances(imp);
      }
    }
    void load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const target = TARGETS.find((t) => t.key === activeTarget)!;

  const modelsForTarget = useMemo(() => {
    if (!models) return [] as Array<Record<string, string | number>>;
    const rows = target.kind === "regression" ? models.regression : models.classification;
    return rows.filter((r) => String(r.task) === target.key);
  }, [models, target]);

  const bestForTarget = useMemo(() => {
    if (!modelsForTarget.length) return null;
    return [...modelsForTarget].sort(
      (a, b) => Number(b[target.metric]) - Number(a[target.metric]),
    )[0];
  }, [modelsForTarget, target]);

  const importanceForTarget = importances.find((i) => i.target === target.key);

  // Unified feature × target importance heatmap
  const heatmapData = useMemo(() => {
    if (importances.length === 0) return null;
    const featureScores: Record<string, Record<string, number>> = {};
    importances.forEach((imp) => {
      imp.rows.slice(0, 10).forEach((r) => {
        if (!featureScores[r.feature]) featureScores[r.feature] = {};
        featureScores[r.feature][imp.target] = Number(r.importance);
      });
    });
    const allFeatures = Object.keys(featureScores);
    // rank features by summed importance, take top 12
    const ranked = allFeatures
      .map((f) => ({
        f,
        total: Object.values(featureScores[f]).reduce((a, v) => a + v, 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12)
      .map((x) => x.f);
    const targetsList = TARGETS.map((t) => t.key);
    const cells: Array<[number, number, number]> = [];
    ranked.forEach((f, fi) => {
      targetsList.forEach((t, ti) => {
        const v = featureScores[f]?.[t] ?? 0;
        cells.push([ti, fi, v]);
      });
    });
    return { features: ranked, targets: targetsList, cells };
  }, [importances]);

  if (!models) {
    return (
      <div className="surface-panel p-8">
        <p className="eyebrow">Models</p>
        <h1 className="font-display mt-4 text-3xl italic tracking-tight text-ink">Model Lab</h1>
        <p className="mt-4 text-sm text-muted">Models are still warming up.</p>
      </div>
    );
  }

  // Leaderboard bar chart
  const leaderboardOption: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 14, right: 14, top: 14, bottom: 10, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const p = params[0];
        return `<b>${p.name}</b><br/>${target.metricLabel}: ${Number(p.value).toFixed(3)}`;
      },
    },
    xAxis: {
      type: "value",
      max: target.metric === "roc_auc" ? 1 : undefined,
      axisLabel: { color: "#7A7A88", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
    },
    yAxis: {
      type: "category",
      data: modelsForTarget.map((r) => String(r.algorithm)).reverse(),
      axisLabel: { color: "#141420", fontSize: 11, fontWeight: 500 as any },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: [...modelsForTarget].reverse().map((r) => {
          const isWinner = String(r.algorithm) === String(bestForTarget?.algorithm);
          return {
            value: Number(r[target.metric]),
            itemStyle: {
              color: isWinner
                ? {
                    type: "linear",
                    x: 0,
                    y: 0,
                    x2: 1,
                    y2: 0,
                    colorStops: [
                      { offset: 0, color: "#F58529" },
                      { offset: 1, color: "#8134AF" },
                    ],
                  }
                : COLORS_BY_MODEL[String(r.algorithm)] || "#C5C5D0",
              borderRadius: [0, 10, 10, 0],
            },
          };
        }),
        label: {
          show: true,
          position: "right",
          formatter: (p: any) => Number(p.value).toFixed(3),
          color: "#141420",
          fontSize: 11,
          fontWeight: 600,
        },
        barWidth: 22,
      },
    ],
  };

  const importanceOption: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 14, right: 20, top: 10, bottom: 10, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: {
      type: "value",
      axisLabel: { color: "#7A7A88", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
    },
    yAxis: {
      type: "category",
      data: (importanceForTarget?.rows.slice(0, 10) ?? []).map((r) => r.feature).reverse(),
      axisLabel: { color: "#141420", fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: (importanceForTarget?.rows.slice(0, 10) ?? []).map((r) => Number(r.importance)).reverse(),
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: `${target.color}AA` },
              { offset: 1, color: target.color },
            ],
          },
          borderRadius: [0, 8, 8, 0],
        },
        barWidth: 14,
      },
    ],
  };

  const heatmapOption: EChartsOption | null = heatmapData
    ? {
        backgroundColor: "transparent",
        grid: { left: 8, right: 8, top: 54, bottom: 48, containLabel: true },
        tooltip: {
          position: "top",
          formatter: (p: any) =>
            `<b>${heatmapData.features[p.data[1]]}</b><br/>${heatmapData.targets[p.data[0]]}: ${Number(p.data[2]).toFixed(4)}`,
        },
        xAxis: {
          type: "category",
          data: heatmapData.targets.map((t) => TARGETS.find((x) => x.key === t)?.short ?? t),
          position: "top",
          splitArea: { show: true },
          axisLabel: { color: "#141420", fontSize: 11, fontWeight: 600 as any },
          axisLine: { show: false },
          axisTick: { show: false },
        },
        yAxis: {
          type: "category",
          data: heatmapData.features,
          splitArea: { show: true },
          axisLabel: { color: "#141420", fontSize: 11 },
          axisLine: { show: false },
          axisTick: { show: false },
        },
        visualMap: {
          min: 0,
          max: Math.max(...heatmapData.cells.map((c) => c[2])) || 1,
          calculable: true,
          orient: "horizontal",
          left: "center",
          bottom: 0,
          inRange: { color: HEATMAP_RANGE_IG },
          textStyle: { color: "#7A7A88", fontSize: 10 },
        },
        series: [
          {
            type: "heatmap",
            data: heatmapData.cells,
            itemStyle: { borderRadius: 6, borderColor: "#FFFFFF", borderWidth: 3 },
          },
        ],
      }
    : null;

  return (
    <div className="max-w-full space-y-8 overflow-x-hidden">
      {/* HERO */}
      <FadeIn>
        <div className="surface-panel overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1.2fr,1fr]">
            <div className="px-6 py-8 sm:px-10 sm:py-10">
              <p className="eyebrow">Predictive modeling</p>
              <h1 className="font-display mt-4 text-4xl italic leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">
                Four algorithms, <span className="ig-gradient-text">four targets</span>, one story.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
                Every target is evaluated against the same competitive slate — linear / Ridge, Random Forest, and HistGradientBoosting — trained on an 80/20 split with StandardScaler and held-out permutation importance. Pick a target below to see the full leaderboard and why the winner wins.
              </p>
            </div>
            <div className="relative min-h-[200px] overflow-hidden lg:min-h-[320px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/friends-suffering-from-social-media-addiction.jpg"
                alt="Students affected by social media addiction and screen overload"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(129,52,175,0.55)] via-[rgba(221,42,123,0.35)] to-[rgba(245,133,41,0.25)] mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/30 to-transparent lg:from-white lg:via-white/15" />
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Winner cards — one per target, always visible */}
      <StaggerChildren className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" stagger={0.08}>
        {TARGETS.map((t) => {
          const rows = t.kind === "regression" ? models.regression : models.classification;
          const winner = [...rows.filter((r) => String(r.task) === t.key)].sort(
            (a, b) => Number(b[t.metric]) - Number(a[t.metric]),
          )[0];
          const isActive = activeTarget === t.key;
          return (
            <MotionDiv key={t.key} variants={staggerItemVariants}>
              <button
                type="button"
                onClick={() => setActiveTarget(t.key)}
                className={`group w-full rounded-3xl border p-5 text-left transition ${
                  isActive
                    ? "border-[rgba(221,42,123,0.35)] bg-gradient-to-br from-white to-[rgba(245,133,41,0.06)] shadow-[0_12px_28px_-20px_rgba(221,42,123,0.4)]"
                    : "border-black/[0.06] bg-white hover:-translate-y-0.5 hover:border-[rgba(221,42,123,0.2)]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <p className="eyebrow" style={{ color: t.color }}>
                    {t.short}
                  </p>
                  {isActive && <Crown className="h-4 w-4" style={{ color: t.color }} />}
                </div>
                <p className="mt-2 text-[13px] font-semibold leading-tight text-ink">
                  {String(winner?.algorithm ?? "—")}
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <div className="font-display text-[2rem] italic leading-none tracking-tight text-ink">
                    {formatMetric(Number(winner?.[t.metric] ?? 0))}
                  </div>
                  <p className="pb-1 text-[10px] uppercase tracking-[0.2em] text-muted">{t.metricLabel}</p>
                </div>
              </button>
            </MotionDiv>
          );
        })}
      </StaggerChildren>

      {/* Active target detail */}
      <FadeIn key={activeTarget}>
        <div className="surface-panel overflow-hidden p-0">
          <div
            className="h-1"
            style={{
              background: `linear-gradient(90deg, ${target.color}, #8134AF)`,
            }}
          />
          <div className="p-6 sm:p-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow" style={{ color: target.color }}>
                  {target.kind === "regression" ? "Regression task" : "Classification task"}
                </p>
                <h2 className="mt-3 font-display text-3xl italic tracking-[-0.03em] text-ink sm:text-4xl">
                  {target.key}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{target.blurb}</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-[rgba(221,42,123,0.18)] bg-gradient-to-br from-[rgba(245,133,41,0.08)] to-[rgba(129,52,175,0.08)] px-4 py-3">
                <Trophy className="h-5 w-5 text-[#B02566]" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#B02566]">Winner</p>
                  <p className="font-semibold text-ink">{String(bestForTarget?.algorithm ?? "—")}</p>
                </div>
              </div>
            </div>

            {/* LEADERBOARD */}
            <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
              <div className="rounded-3xl border border-black/[0.05] bg-white p-5">
                <p className="eyebrow">Leaderboard</p>
                <h3 className="mt-2 font-display text-xl italic tracking-tight text-ink">
                  All candidates, ranked by {target.metricLabel}
                </h3>
                <div className="mt-4">
                  <EChart option={leaderboardOption} height={Math.max(160, modelsForTarget.length * 50)} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-[rgba(221,42,123,0.15)] bg-gradient-to-br from-[rgba(245,133,41,0.06)] to-[rgba(129,52,175,0.04)] p-5">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#B02566]" />
                    <p className="eyebrow" style={{ color: "#B02566" }}>Why this model won</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink">{target.whyWon}</p>
                </div>
                <div className="rounded-3xl border border-black/[0.05] bg-white p-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#2E7D5B]" />
                    <p className="eyebrow">How accurate is accurate</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{target.whyHard}</p>
                </div>
                {/* Metric panel */}
                <div className="rounded-3xl border border-black/[0.05] bg-white p-5">
                  <p className="eyebrow">Winner metrics</p>
                  {target.kind === "regression" ? (
                    <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted">R²</p>
                        <p className="font-display mt-1 text-2xl italic tracking-tight text-ink">
                          <AnimatedCounter value={Number(bestForTarget?.r2 ?? 0)} decimals={3} />
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted">RMSE</p>
                        <p className="font-display mt-1 text-2xl italic tracking-tight text-ink">
                          <AnimatedCounter value={Number(bestForTarget?.rmse ?? 0)} decimals={3} />
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted">MAE</p>
                        <p className="font-display mt-1 text-2xl italic tracking-tight text-ink">
                          <AnimatedCounter value={Number(bestForTarget?.mae ?? 0)} decimals={3} />
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Accuracy</p>
                        <p className="font-display mt-1 text-2xl italic tracking-tight text-ink">
                          <AnimatedCounter value={Number(bestForTarget?.accuracy ?? 0)} decimals={3} />
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted">F1</p>
                        <p className="font-display mt-1 text-2xl italic tracking-tight text-ink">
                          <AnimatedCounter value={Number(bestForTarget?.f1 ?? 0)} decimals={3} />
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted">ROC AUC</p>
                        <p className="font-display mt-1 text-2xl italic tracking-tight text-ink">
                          <AnimatedCounter value={Number(bestForTarget?.roc_auc ?? 0)} decimals={3} />
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Feature importance for active target */}
            <div className="mt-8 rounded-3xl border border-black/[0.05] bg-white p-5">
              <p className="eyebrow">Top drivers</p>
              <h3 className="mt-2 font-display text-xl italic tracking-tight text-ink">
                What the winning model leans on
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted">
                Permutation importance on the held-out set — larger bars shift predictions more when the feature is shuffled.
              </p>
              <div className="mt-4">
                <EChart option={importanceOption} height={360} />
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Global feature × target heatmap */}
      <FadeIn>
        <ChartCard
          eyebrow="Cross-target view"
          title="Which features drive which outcomes"
          description="Top-12 features (ranked by summed permutation importance) against all four targets. Darker = the feature matters more for that target."
        >
          {heatmapOption ? <EChart option={heatmapOption} height={480} /> : <p className="text-sm text-muted">Loading…</p>}
        </ChartCard>
      </FadeIn>

      {/* Model family explainer */}
      <FadeIn>
        <div className="surface-panel p-7 sm:p-9">
          <p className="eyebrow">The slate</p>
          <h2 className="mt-3 font-display text-3xl italic tracking-[-0.03em] text-ink sm:text-4xl">
            Why we try <span className="ig-gradient-text">these four</span>
          </h2>
          <StaggerChildren className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" stagger={0.08}>
            {[
              {
                name: "Linear / Logistic",
                tint: "#4FC3E8",
                blurb: "Baseline. Fast, interpretable, and a useful floor — if boosting only barely beats it, the feature space is already highly linear.",
              },
              {
                name: "Ridge",
                tint: "#BEE6F2",
                blurb: "Regularized linear regression. Handles collinearity among the engineered usage features without overfitting.",
              },
              {
                name: "Random Forest",
                tint: "#F58529",
                blurb: "Bagged trees capture non-linearities and interactions. Robust baseline for tabular data; less sensitive to scaling.",
              },
              {
                name: "HistGradientBoosting",
                tint: "#DD2A7B",
                blurb: "State-of-the-art for tabular. Sequential residual learning + histogram splits — wins all four targets here.",
              },
            ].map((m) => (
              <MotionDiv
                key={m.name}
                variants={staggerItemVariants}
                className="relative rounded-3xl border border-black/[0.06] bg-white p-5"
              >
                <div className="absolute left-0 top-5 h-8 w-1 rounded-r-full" style={{ backgroundColor: m.tint }} />
                <p className="pl-2 text-sm font-semibold text-ink">{m.name}</p>
                <p className="mt-2 pl-2 text-xs leading-5 text-muted">{m.blurb}</p>
              </MotionDiv>
            ))}
          </StaggerChildren>
        </div>
      </FadeIn>
    </div>
  );
}