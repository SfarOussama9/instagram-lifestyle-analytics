"use client";

import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { ChevronDown, Sparkles, Target, Zap } from "lucide-react";

import {
  getFeatureImportance,
  getFeatureSchema,
  postProjectPrediction,
  type FeatureImportancePayload,
  type FeatureSchemaPayload,
  type PredictionPayload,
} from "../lib/api";
import { EChart } from "./echart";

type CoreNumeric = {
  key: string;
  label: string;
  step: number;
  defaultMax?: number;
};

const CORE_NUMERICS: CoreNumeric[] = [
  { key: "age", label: "Age", step: 1, defaultMax: 90 },
  { key: "daily_active_minutes_instagram", label: "Daily Instagram minutes", step: 1, defaultMax: 420 },
  { key: "sessions_per_day", label: "Sessions per day", step: 1, defaultMax: 40 },
  { key: "sleep_hours_per_night", label: "Sleep hours", step: 0.1, defaultMax: 12 },
  { key: "exercise_hours_per_week", label: "Exercise hours / week", step: 0.1, defaultMax: 15 },
  { key: "notification_response_rate", label: "Notification response rate", step: 0.01, defaultMax: 1 },
  { key: "reels_watched_per_day", label: "Reels / day", step: 1, defaultMax: 300 },
  { key: "posts_created_per_week", label: "Posts / week", step: 1, defaultMax: 60 },
  { key: "followers_count", label: "Followers", step: 10, defaultMax: 30000 },
];

const CORE_CATEGORICALS = [
  { key: "gender", label: "Gender", fallback: ["Female", "Male", "Non-binary"] },
  { key: "country", label: "Country", fallback: ["USA", "India", "Brazil"] },
  { key: "urban_rural", label: "Urban / Rural", fallback: ["Urban", "Suburban", "Rural"] },
  { key: "employment_status", label: "Employment", fallback: ["Student", "Employed", "Unemployed"] },
  { key: "content_type_preference", label: "Content type", fallback: ["Reels", "Photos", "Stories"] },
  { key: "preferred_content_theme", label: "Content theme", fallback: ["Lifestyle", "Sports", "News"] },
];

const EXTRA_NUMERICS: CoreNumeric[] = [
  { key: "stories_viewed_per_day", label: "Stories / day", step: 1, defaultMax: 300 },
  { key: "likes_given_per_day", label: "Likes given / day", step: 1, defaultMax: 300 },
  { key: "comments_written_per_day", label: "Comments written / day", step: 1, defaultMax: 60 },
  { key: "dms_sent_per_week", label: "DMs sent / week", step: 1, defaultMax: 160 },
  { key: "dms_received_per_week", label: "DMs received / week", step: 1, defaultMax: 160 },
  { key: "following_count", label: "Following", step: 10, defaultMax: 15000 },
];

const EXTRA_CATEGORICALS = [
  { key: "income_level", label: "Income level", fallback: ["Low", "Medium", "High"] },
  { key: "education_level", label: "Education", fallback: ["Bachelor", "Master", "PhD"] },
  { key: "relationship_status", label: "Relationship", fallback: ["Single", "Partnered", "Married"] },
];

const TARGET_COLORS: Record<string, string> = {
  "Self-Reported Happiness": "#F58529",
  "Perceived Stress Score": "#DD2A7B",
  "User Engagement Score": "#8134AF",
  "Social Media Addiction Risk": "#B02566",
};

const GAUGE_META = [
  { target: "Self-Reported Happiness", label: "Happiness", max: 10, suffix: "", color: "#F58529" },
  { target: "Perceived Stress Score", label: "Stress", max: 40, suffix: "", color: "#DD2A7B" },
  { target: "User Engagement Score", label: "Engagement", max: 10, suffix: "", color: "#8134AF" },
  { target: "Social Media Addiction Risk", label: "Risk", max: 100, suffix: "%", color: "#B02566", isPct: true },
];

export function PredictConsole() {
  const [schema, setSchema] = useState<FeatureSchemaPayload | null>(null);
  const [importances, setImportances] = useState<FeatureImportancePayload[]>([]);
  const [form, setForm] = useState<Record<string, string | number>>({});
  const [showAll, setShowAll] = useState(false);
  const [result, setResult] = useState<PredictionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, imp] = await Promise.all([
          getFeatureSchema(),
          Promise.all([
            getFeatureImportance("Self-Reported Happiness").catch(() => null),
            getFeatureImportance("Perceived Stress Score").catch(() => null),
            getFeatureImportance("User Engagement Score").catch(() => null),
            getFeatureImportance("Social Media Addiction Risk").catch(() => null),
          ]),
        ]);
        if (cancelled) return;
        setSchema(s);
        setImportances(imp.filter(Boolean) as FeatureImportancePayload[]);
        const initial: Record<string, string | number> = {};
        [...CORE_NUMERICS, ...EXTRA_NUMERICS].forEach((n) => {
          initial[n.key] = s.numeric[n.key]?.median ?? 0;
        });
        [...CORE_CATEGORICALS, ...EXTRA_CATEGORICALS].forEach((c) => {
          const vals = s.categorical[c.key] ?? c.fallback;
          initial[c.key] = vals[0] ?? "";
        });
        setForm(initial);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load schema");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function numericBounds(key: string, fallbackMax: number) {
    const stats = schema?.numeric[key];
    return {
      min: stats ? Math.max(0, Math.floor(stats.min)) : 0,
      max: stats ? Math.ceil(stats.max) : fallbackMax,
    };
  }

  function categoricalValues(key: string, fallback: string[]) {
    return schema?.categorical[key] ?? fallback;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await postProjectPrediction(form);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed.");
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(preset: "doom" | "balanced" | "power") {
    setForm((current) => {
      const patch: Record<string, string | number> = {};
      if (preset === "doom") {
        patch.daily_active_minutes_instagram = 310;
        patch.sessions_per_day = 24;
        patch.reels_watched_per_day = 220;
        patch.stories_viewed_per_day = 160;
        patch.likes_given_per_day = 180;
        patch.comments_written_per_day = 18;
        patch.notification_response_rate = 0.94;
        patch.sleep_hours_per_night = 5.4;
      } else if (preset === "power") {
        patch.daily_active_minutes_instagram = 32;
        patch.sessions_per_day = 6;
        patch.followers_count = 21000;
        patch.following_count = 1800;
        patch.reels_watched_per_day = 18;
        patch.stories_viewed_per_day = 12;
        patch.likes_given_per_day = 28;
        patch.comments_written_per_day = 6;
        patch.notification_response_rate = 0.44;
        patch.sleep_hours_per_night = 7.8;
      } else {
        patch.daily_active_minutes_instagram = 115;
        patch.sessions_per_day = 11;
        patch.sleep_hours_per_night = 7.3;
        patch.exercise_hours_per_week = 3.8;
        patch.reels_watched_per_day = 48;
        patch.stories_viewed_per_day = 36;
        patch.likes_given_per_day = 64;
        patch.comments_written_per_day = 6;
        patch.notification_response_rate = 0.58;
      }
      return { ...current, ...patch };
    });
  }

  const predictionMap = Object.fromEntries(
    (result?.predictions ?? []).map((item) => [item.target, item.value]),
  );

  const dominantTarget = useMemo(() => {
    if (!result) return null;
    const scores = [
      {
        target: "Social Media Addiction Risk",
        score: Math.abs((Number(predictionMap["Social Media Addiction Risk"]) || 0) - 0.5) * 2,
      },
      {
        target: "Perceived Stress Score",
        score: (Number(predictionMap["Perceived Stress Score"]) || 0) / 40,
      },
      {
        target: "User Engagement Score",
        score: (Number(predictionMap["User Engagement Score"]) || 0) / 10,
      },
      {
        target: "Self-Reported Happiness",
        score: (Number(predictionMap["Self-Reported Happiness"]) || 0) / 10,
      },
    ];
    return scores.sort((a, b) => b.score - a.score)[0].target;
  }, [result, predictionMap]);

  const topDrivers = useMemo(() => {
    if (!dominantTarget) return [];
    const imp = importances.find((i) => i.target === dominantTarget);
    return imp?.rows.slice(0, 3) ?? [];
  }, [dominantTarget, importances]);

  function renderSlider(field: CoreNumeric) {
    const { min, max } = numericBounds(field.key, field.defaultMax ?? 100);
    const current = Number(form[field.key] ?? min);
    const pct = max > min ? ((current - min) / (max - min)) * 100 : 0;
    return (
      <label key={field.key} className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium text-ink/80">{field.label}</span>
          <span className="rounded-full bg-[rgba(221,42,123,0.08)] px-2.5 py-0.5 text-xs font-semibold text-[#B02566]">
            {field.step < 1 ? current.toFixed(2) : current.toLocaleString()}
          </span>
        </div>
        <div className="relative">
          <div
            className="pointer-events-none absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg,#F58529,#DD2A7B,#8134AF)",
            }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={field.step}
            value={current}
            onChange={(event) =>
              setForm((current) => ({ ...current, [field.key]: Number(event.target.value) }))
            }
            className="slider-ig relative h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[rgba(17,17,27,0.08)]"
          />
        </div>
        <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>{field.step < 1 ? min.toFixed(1) : min.toLocaleString()}</span>
          <span>{field.step < 1 ? max.toFixed(1) : max.toLocaleString()}</span>
        </div>
      </label>
    );
  }

  function renderSelect(field: { key: string; label: string; fallback: string[] }) {
    const values = categoricalValues(field.key, field.fallback);
    return (
      <label key={field.key} className="space-y-2 text-sm">
        <span className="font-medium text-ink/80">{field.label}</span>
        <div className="relative">
          <select
            value={String(form[field.key] ?? values[0] ?? "")}
            onChange={(event) =>
              setForm((current) => ({ ...current, [field.key]: event.target.value }))
            }
            className="w-full appearance-none rounded-2xl border border-black/[0.08] bg-white px-4 py-2.5 pr-10 text-sm font-medium text-ink shadow-[0_1px_2px_rgba(17,17,27,0.04)] outline-none transition focus:border-[#DD2A7B] focus:ring-2 focus:ring-[rgba(221,42,123,0.12)]"
          >
            {values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
      </label>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={handleSubmit} className="surface-panel p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Live predict</p>
            <h2 className="mt-2 font-display text-2xl italic tracking-tight text-ink">Sketch a user profile</h2>
            <p className="mt-1 text-xs text-muted">15 core inputs â€” expand below for all 18.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["doom", "Doom"],
                ["balanced", "Balanced"],
                ["power", "Power"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => applyPreset(k)}
                className="rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition hover:border-[rgba(221,42,123,0.3)] hover:text-[#B02566]"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-5">
            <p className="eyebrow">Behavior</p>
            {CORE_NUMERICS.map(renderSlider)}
          </div>
          <div className="space-y-5">
            <p className="eyebrow">Who they are</p>
            {CORE_CATEGORICALS.map(renderSelect)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="mt-7 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-[rgba(17,17,27,0.03)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink transition hover:border-[rgba(221,42,123,0.3)]"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`}
          />
          {showAll ? "Hide" : "Show"} all features
        </button>

        {showAll && (
          <div className="mt-5 rounded-3xl border border-dashed border-black/[0.08] bg-[rgba(17,17,27,0.02)] p-5">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-5">
                <p className="eyebrow">More behavior</p>
                {EXTRA_NUMERICS.map(renderSlider)}
              </div>
              <div className="space-y-5">
                <p className="eyebrow">More profile</p>
                {EXTRA_CATEGORICALS.map(renderSelect)}
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !schema}
          className="mt-7 inline-flex items-center gap-2 rounded-full ig-gradient-bg px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_14px_30px_-14px_rgba(221,42,123,0.55)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Zap className="h-4 w-4" />
          {loading ? "Scoringâ€¦" : "Predict all targets"}
        </button>
      </form>

      <div className="space-y-4">
        <div className="surface-panel p-6">
          <p className="eyebrow">Prediction output</p>
          {error && <p className="mt-3 text-sm text-[#B91C1C]">{error}</p>}
          {!result && !error && (
            <p className="mt-3 text-xs leading-5 text-muted">Run a profile to populate the gauges and persona match.</p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {GAUGE_META.map((card) => {
              const raw = Number(predictionMap[card.target] ?? 0);
              const value = card.isPct ? raw * 100 : raw;
              const option: EChartsOption = {
                backgroundColor: "transparent",
                series: [
                  {
                    type: "gauge",
                    min: 0,
                    max: card.max,
                    startAngle: 210,
                    endAngle: -30,
                    pointer: { show: false },
                    progress: {
                      show: true,
                      roundCap: true,
                      width: 10,
                      itemStyle: { color: card.color },
                    },
                    axisLine: {
                      lineStyle: { width: 10, color: [[1, "rgba(17,17,27,0.06)"]] },
                    },
                    splitLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: { show: false },
                    detail: {
                      valueAnimation: true,
                      formatter: `{value}${card.suffix}`,
                      color: "#141420",
                      fontSize: 20,
                      fontWeight: 600,
                      offsetCenter: [0, "10%"],
                    },
                    title: { offsetCenter: [0, "82%"], color: "#7A7A88", fontSize: 11 },
                    data: [{ value: Number(value.toFixed(card.isPct ? 0 : 2)), name: card.label }],
                  },
                ],
              };
              return (
                <div key={card.target} className="rounded-[22px] border border-black/[0.05] bg-gradient-to-br from-white to-[rgba(245,133,41,0.04)] p-2">
                  <EChart option={option} height={170} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface-panel relative overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF]" />
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(221,42,123,0.12)] text-[#B02566]">
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="eyebrow">Persona match</p>
              <p className="mt-1 font-display text-2xl italic tracking-tight text-ink">
                {result?.nearest_persona ?? "â€”"}
              </p>
              <p className="text-xs text-muted">Cluster {result?.cluster_id ?? "â€”"}</p>
            </div>
          </div>
        </div>

        {result && dominantTarget && topDrivers.length > 0 && (
          <div className="surface-panel p-6">
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: `${TARGET_COLORS[dominantTarget] ?? "#DD2A7B"}22`,
                  color: TARGET_COLORS[dominantTarget] ?? "#DD2A7B",
                }}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="eyebrow" style={{ color: TARGET_COLORS[dominantTarget] ?? "#B02566" }}>
                  Why this result
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  Top drivers for {dominantTarget}
                </p>
                <div className="mt-3 space-y-2">
                  {topDrivers.map((d, i) => {
                    const maxImp = topDrivers[0]?.importance || 1;
                    const pct = (Number(d.importance) / Number(maxImp)) * 100;
                    return (
                      <div key={d.feature}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-ink">
                            {i + 1}. {d.feature}
                          </span>
                          <span className="text-muted">{Number(d.importance).toFixed(3)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[rgba(17,17,27,0.05)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: TARGET_COLORS[dominantTarget] ?? "#DD2A7B",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
