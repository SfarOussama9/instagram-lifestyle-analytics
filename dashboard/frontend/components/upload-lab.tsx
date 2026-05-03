"use client";

import type { EChartsOption } from "echarts";
import { Download, Globe2, Sparkles, Upload, Users, WandSparkles } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";

import { ChartCard } from "./chart-card";
import { EChart } from "./echart";
import { KpiCard } from "./kpi-card";
import { FadeIn } from "./motion";
import {
  getStatus,
  uploadInstagramSchema,
  type InstagramScoringPayload,
  type StatusPayload,
} from "../lib/api";

const FALLBACK_STATUS: StatusPayload = {
  ready: false,
  stage: "unknown",
  progress: 0,
  message: "Checking backend status...",
};

const targetLabels: Record<string, string> = {
  predicted_self_reported_happiness: "Predicted happiness",
  predicted_perceived_stress_score: "Predicted stress",
  predicted_user_engagement_score: "Predicted engagement",
  predicted_social_media_addiction_risk: "Predicted addiction risk",
};

function chartBase(): Pick<EChartsOption, "backgroundColor" | "textStyle" | "tooltip" | "grid"> {
  return {
    backgroundColor: "transparent",
    textStyle: { color: "#141420", fontFamily: "var(--font-sans)" },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "rgba(17,17,27,0.06)",
      textStyle: { color: "#141420" },
    },
    grid: { left: 44, right: 20, top: 28, bottom: 40 },
  };
}

function toCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return "";
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: string | number | undefined) => {
    const s = value === undefined ? "" : String(value);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(","));
  return lines.join("\n");
}

function downloadCsv(rows: Array<Record<string, string | number>>, filename: string) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function UploadLab() {
  const [file, setFile] = useState<File | null>(null);
  const [instagramPrediction, setInstagramPrediction] = useState<InstagramScoringPayload | null>(null);
  const [status, setStatus] = useState<StatusPayload>(FALLBACK_STATUS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      try {
        const nextStatus = await getStatus();
        if (!cancelled) startTransition(() => setStatus(nextStatus));
      } catch {
        if (!cancelled) startTransition(() => setStatus(FALLBACK_STATUS));
      }
    }
    void loadStatus();
    const interval = window.setInterval(() => void loadStatus(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const personaChart = useMemo<EChartsOption | null>(() => {
    if (!instagramPrediction) return null;
    const personaEntries = Object.entries(instagramPrediction.persona_share);
    return {
      ...chartBase(),
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(255,255,255,0.96)",
        borderColor: "rgba(17,17,27,0.06)",
        textStyle: { color: "#141420" },
      },
      legend: { bottom: 0, textStyle: { color: "#7A7A88" } },
      series: [
        {
          type: "pie",
          radius: ["48%", "72%"],
          center: ["50%", "44%"],
          padAngle: 2,
          data: personaEntries.map(([name, value]) => ({ name, value })),
          itemStyle: { borderColor: "#FFFFFF", borderWidth: 3, borderRadius: 6 },
          label: { color: "#141420" },
          color: ["#DD2A7B", "#8134AF", "#4FC3E8", "#F58529", "#55A868", "#CCB974"],
        },
      ],
    };
  }, [instagramPrediction]);

  const stressChart = useMemo<EChartsOption | null>(() => {
    if (!instagramPrediction) return null;
    return {
      ...chartBase(),
      xAxis: {
        type: "category",
        data: instagramPrediction.stress_distribution.map((row) => row.bucket),
        axisLine: { lineStyle: { color: "rgba(17,17,27,0.12)" } },
        axisLabel: { color: "#7A7A88" },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
        axisLabel: { color: "#7A7A88" },
      },
      series: [
        {
          type: "bar",
          data: instagramPrediction.stress_distribution.map((row) => row.count),
          barWidth: 28,
          itemStyle: { color: "#F58529", borderRadius: [10, 10, 0, 0] },
        },
      ],
    };
  }, [instagramPrediction]);

  const happinessChart = useMemo<EChartsOption | null>(() => {
    if (!instagramPrediction) return null;
    return {
      ...chartBase(),
      xAxis: {
        type: "category",
        data: instagramPrediction.happiness_distribution.map((row) => row.bucket),
        axisLine: { lineStyle: { color: "rgba(17,17,27,0.12)" } },
        axisLabel: { color: "#7A7A88" },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
        axisLabel: { color: "#7A7A88" },
      },
      series: [
        {
          type: "bar",
          data: instagramPrediction.happiness_distribution.map((row) => row.count),
          barWidth: 18,
          itemStyle: { color: "#DD2A7B", borderRadius: [10, 10, 0, 0] },
        },
      ],
    };
  }, [instagramPrediction]);

  const engagementChart = useMemo<EChartsOption | null>(() => {
    if (!instagramPrediction) return null;
    return {
      ...chartBase(),
      xAxis: {
        type: "category",
        data: instagramPrediction.engagement_distribution.map((row) => row.bucket),
        axisLine: { lineStyle: { color: "rgba(17,17,27,0.12)" } },
        axisLabel: { color: "#7A7A88" },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
        axisLabel: { color: "#7A7A88" },
      },
      series: [
        {
          type: "bar",
          data: instagramPrediction.engagement_distribution.map((row) => row.count),
          barWidth: 28,
          itemStyle: { color: "#4FC3E8", borderRadius: [10, 10, 0, 0] },
        },
      ],
    };
  }, [instagramPrediction]);

  const addictionChart = useMemo<EChartsOption | null>(() => {
    if (!instagramPrediction) return null;
    const palette = ["#55A868", "#CCB974", "#F58529", "#DD2A7B", "#B02566"];
    return {
      ...chartBase(),
      xAxis: {
        type: "category",
        data: instagramPrediction.addiction_distribution.map((row) => row.bucket),
        axisLine: { lineStyle: { color: "rgba(17,17,27,0.12)" } },
        axisLabel: { color: "#7A7A88" },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
        axisLabel: { color: "#7A7A88" },
      },
      series: [
        {
          type: "bar",
          data: instagramPrediction.addiction_distribution.map((row, idx) => ({
            value: row.count,
            itemStyle: { color: palette[idx] ?? "#8134AF", borderRadius: [10, 10, 0, 0] },
          })),
          barWidth: 28,
        },
      ],
    };
  }, [instagramPrediction]);

  const countryChart = useMemo<EChartsOption | null>(() => {
    if (!instagramPrediction || instagramPrediction.country_summary.length === 0) return null;
    const rows = instagramPrediction.country_summary;
    return {
      ...chartBase(),
      legend: { top: 0, textStyle: { color: "#7A7A88" } },
      grid: { left: 56, right: 56, top: 40, bottom: 52 },
      xAxis: {
        type: "category",
        data: rows.map((row) => row.country),
        axisLine: { lineStyle: { color: "rgba(17,17,27,0.12)" } },
        axisLabel: { color: "#7A7A88", rotate: 20 },
      },
      yAxis: [
        {
          type: "value",
          name: "Stress / Happiness",
          axisLabel: { color: "#7A7A88" },
          splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
        },
        {
          type: "value",
          name: "High-risk %",
          axisLabel: { color: "#7A7A88", formatter: "{value}%" },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Avg stress",
          type: "bar",
          data: rows.map((row) => row.avg_predicted_stress),
          barWidth: 16,
          itemStyle: { color: "#F58529", borderRadius: [8, 8, 0, 0] },
        },
        {
          name: "Avg happiness",
          type: "bar",
          data: rows.map((row) => row.avg_predicted_happiness),
          barWidth: 16,
          itemStyle: { color: "#DD2A7B", borderRadius: [8, 8, 0, 0] },
        },
        {
          name: "High addiction %",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: rows.map((row) => row.high_addiction_rate),
          lineStyle: { color: "#8134AF", width: 3 },
          itemStyle: { color: "#8134AF" },
          symbolSize: 8,
        },
      ],
    };
  }, [instagramPrediction]);

  const correlationGroups = useMemo(() => {
    if (!instagramPrediction) return [];
    return Object.entries(instagramPrediction.top_prediction_correlations).map(([target, values]) => ({
      target: targetLabels[target] ?? target,
      rows: Object.entries(values),
    }));
  }, [instagramPrediction]);

  async function handleScore(fileToScore: File | null = file) {
    if (!fileToScore) return;
    setLoading(true);
    setError(null);
    try {
      const response = await uploadInstagramSchema(fileToScore);
      setInstagramPrediction(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scoring failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragOver(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped && dropped.name.toLowerCase().endsWith(".csv")) {
      setFile(dropped);
    }
  }

  return (
    <div className="max-w-full space-y-6 overflow-x-hidden">
      <FadeIn>
        <div className="surface-panel relative overflow-hidden p-0">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF]" />
          <div className="grid gap-0 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="px-6 py-9 sm:px-10 sm:py-12">
              <p className="eyebrow">One-click scoring</p>
              <h1 className="font-display mt-3 text-4xl italic leading-[1.05] tracking-[-0.035em] text-ink sm:text-5xl">
                Drop a CSV.
                <br />
                <span className="ig-gradient-text">Push the button</span>.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
                Upload any Instagram-schema CSV and score it against the project&rsquo;s trained models. No configuration, no target picking — just results.
              </p>

              <label
                htmlFor="upload-lab-file"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`mt-7 flex cursor-pointer items-center gap-4 rounded-3xl border-2 border-dashed px-5 py-5 transition ${
                  dragOver
                    ? "border-[#DD2A7B] bg-[rgba(221,42,123,0.06)]"
                    : "border-black/[0.1] bg-[rgba(17,17,27,0.025)] hover:border-[rgba(221,42,123,0.3)]"
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ig-gradient-bg text-white">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {file ? file.name : "Drop CSV here or click to browse"}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted">
                    {file
                      ? `${(file.size / 1024).toFixed(1)} KB ready to score`
                      : "…_engineered.csv works best"}
                  </p>
                </div>
                <input
                  id="upload-lab-file"
                  type="file"
                  accept=".csv"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleScore()}
                  disabled={!file || loading}
                  className="inline-flex items-center gap-2 rounded-full ig-gradient-bg px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_14px_30px_-14px_rgba(221,42,123,0.55)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <WandSparkles className="h-4 w-4" />
                  {loading ? "Scoring…" : "Score with project models"}
                </button>
                <span className="text-[11px] uppercase tracking-[0.2em] text-muted">
                  {status.ready ? "Backend ready" : `Status: ${status.stage}`}
                </span>
              </div>

              {error && (
                <p className="mt-4 rounded-2xl border border-[rgba(244,63,94,0.25)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-sm text-[#B91C1C]">
                  {error}
                </p>
              )}
            </div>

            <div className="relative hidden min-h-[280px] overflow-hidden lg:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/cool-teen-young-woman-pink-hoodie-stylish-sunglasses-takes-selfie-holds-phone-poses-with-headphones-outside.jpg"
                alt="Instagram user creating content on a phone"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/20 to-white" />
              <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(245,133,41,0.25)] to-transparent mix-blend-multiply" />
            </div>
          </div>
        </div>
      </FadeIn>

      {!instagramPrediction && !loading && (
        <FadeIn>
          <div className="surface-panel flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(221,42,123,0.08)]">
              <Sparkles className="h-6 w-6 text-[#DD2A7B]" />
            </div>
            <p className="font-display text-2xl italic tracking-tight text-ink">
              Waiting for your dataset
            </p>
            <p className="max-w-md text-sm text-muted">
              Once scored, this area fills with persona mix, distributions, country breakdowns, and an export-ready table.
            </p>
          </div>
        </FadeIn>
      )}

      {instagramPrediction && (
        <>
          <FadeIn>
            <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <KpiCard
                label="Rows scored"
                value={instagramPrediction.summary.rows_scored.toLocaleString()}
                note={
                  instagramPrediction.summary.was_truncated
                    ? `Capped at ${instagramPrediction.summary.rows_scored.toLocaleString()} for fast scoring.`
                    : `${instagramPrediction.summary.source_rows.toLocaleString()} source rows processed.`
                }
                accent="acid"
              />
              <KpiCard
                label="Avg predicted stress"
                value={instagramPrediction.summary.avg_predicted_stress.toFixed(2)}
                note="Scale 0–40."
                accent="lilac"
              />
              <KpiCard
                label="Avg predicted happiness"
                value={instagramPrediction.summary.avg_predicted_happiness.toFixed(2)}
                note="Scale 1–10."
                accent="acid"
              />
              <KpiCard
                label="Avg predicted engagement"
                value={instagramPrediction.summary.avg_predicted_engagement.toFixed(2)}
                note="Scale 0–100."
                accent="lilac"
              />
              <KpiCard
                label="High addiction-risk share"
                value={`${instagramPrediction.summary.high_addiction_risk_rate.toFixed(1)}%`}
                note={`Dominant persona: ${instagramPrediction.summary.dominant_persona}`}
                accent="neutral"
              />
              <KpiCard
                label="Coverage"
                value={`${instagramPrediction.summary.unique_personas} × ${instagramPrediction.summary.unique_countries}`}
                note="Personas × countries represented."
                accent="neutral"
              />
            </section>
          </FadeIn>

          <FadeIn>
            <section className="grid gap-6 xl:grid-cols-2">
              <ChartCard
                eyebrow="Segmentation"
                title="Predicted persona mix"
                description="The batch mapped into the dashboard persona system."
              >
                {personaChart && <EChart option={personaChart} height={340} />}
              </ChartCard>
              <ChartCard
                eyebrow="Behavioral signal"
                title="Predicted stress distribution"
                description="Rows grouped into stress bands (0–40 scale)."
              >
                {stressChart && <EChart option={stressChart} height={340} />}
              </ChartCard>
              <ChartCard
                eyebrow="Wellbeing"
                title="Predicted happiness spread"
                description="Rounded predicted happiness scores 1–10."
              >
                {happinessChart && <EChart option={happinessChart} height={340} />}
              </ChartCard>
              <ChartCard
                eyebrow="Engagement"
                title="Engagement score spread"
                description="How the uploaded users stack up on the 0–100 engagement score."
              >
                {engagementChart && <EChart option={engagementChart} height={340} />}
              </ChartCard>
              <ChartCard
                eyebrow="Risk"
                title="Addiction probability buckets"
                description="Distribution across five severity bands."
              >
                {addictionChart && <EChart option={addictionChart} height={320} />}
              </ChartCard>
              <ChartCard
                eyebrow="Takeaway"
                title="Quick read"
                description="Auto-generated observations from the scored upload."
              >
                <div className="grid gap-3">
                  {instagramPrediction.insights.map((insight) => (
                    <div
                      key={insight}
                      className="rounded-2xl border border-black/[0.06] bg-[rgba(245,133,41,0.04)] px-4 py-3 text-sm leading-6 text-ink"
                    >
                      {insight}
                    </div>
                  ))}
                </div>
              </ChartCard>
            </section>
          </FadeIn>

          {countryChart && (
            <FadeIn>
              <ChartCard
                eyebrow="Geography"
                title="Top countries in the upload"
                description="Predicted stress, happiness, and high addiction-risk share for the 10 most represented countries."
              >
                <EChart option={countryChart} height={360} />
              </ChartCard>
            </FadeIn>
          )}

          <FadeIn>
            <ChartCard
              eyebrow="Persona × outcomes"
              title="Outcome profile per persona"
              description="Average predicted outcomes for every persona cluster represented in the uploaded batch."
            >
              <div className="max-w-full overflow-x-auto pb-2">
                <table className="min-w-[720px] w-full border-separate border-spacing-y-2 text-left text-xs text-muted sm:text-sm">
                  <thead>
                    <tr>
                      {["Persona", "Users", "Avg stress", "Avg happiness", "Avg engagement", "Avg addiction risk"].map((key) => (
                        <th key={key} className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {instagramPrediction.persona_outcome_matrix.map((row) => (
                      <tr key={row.nearest_persona} className="rounded-2xl bg-[rgba(17,17,27,0.025)] text-ink">
                        <td className="px-3 py-3 align-top first:rounded-l-2xl">
                          <span className="inline-flex items-center gap-2">
                            <Users className="h-4 w-4 text-[#DD2A7B]" />
                            {row.nearest_persona}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">{row.users.toLocaleString()}</td>
                        <td className="px-3 py-3 align-top">{row.avg_predicted_stress.toFixed(2)}</td>
                        <td className="px-3 py-3 align-top">{row.avg_predicted_happiness.toFixed(2)}</td>
                        <td className="px-3 py-3 align-top">{row.avg_predicted_engagement.toFixed(2)}</td>
                        <td className="px-3 py-3 align-top last:rounded-r-2xl">{row.avg_addiction_risk.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </FadeIn>

          {instagramPrediction.country_summary.length > 0 && (
            <FadeIn>
              <ChartCard
                eyebrow="Geography"
                title="Country-level breakdown"
                description="Per-country averages of the predicted outcomes. Sorted by number of users scored."
              >
                <div className="max-w-full overflow-x-auto pb-2">
                  <table className="min-w-[720px] w-full border-separate border-spacing-y-2 text-left text-xs text-muted sm:text-sm">
                    <thead>
                      <tr>
                        {["Country", "Users", "Avg stress", "Avg happiness", "Avg engagement", "High addiction %"].map((key) => (
                          <th key={key} className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {instagramPrediction.country_summary.map((row) => (
                        <tr key={row.country} className="rounded-2xl bg-[rgba(17,17,27,0.025)] text-ink">
                          <td className="px-3 py-3 align-top first:rounded-l-2xl">
                            <span className="inline-flex items-center gap-2">
                              <Globe2 className="h-4 w-4 text-[#8134AF]" />
                              {row.country}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top">{row.users.toLocaleString()}</td>
                          <td className="px-3 py-3 align-top">{row.avg_predicted_stress.toFixed(2)}</td>
                          <td className="px-3 py-3 align-top">{row.avg_predicted_happiness.toFixed(2)}</td>
                          <td className="px-3 py-3 align-top">{row.avg_predicted_engagement.toFixed(2)}</td>
                          <td className="px-3 py-3 align-top last:rounded-r-2xl">{row.high_addiction_rate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            </FadeIn>
          )}

          <FadeIn>
            <ChartCard
              eyebrow="Drivers"
              title="What is driving the predictions"
              description="Top absolute correlations between engineered numeric features and each predicted target in the uploaded batch."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {correlationGroups.map((group) => {
                  const maxVal = Math.max(...group.rows.map(([, v]) => Math.abs(Number(v))), 1);
                  return (
                    <div key={group.target} className="rounded-2xl border border-black/[0.06] bg-[rgba(17,17,27,0.025)] p-4">
                      <p className="text-sm font-semibold text-ink">{group.target}</p>
                      <div className="mt-3 space-y-2 text-sm text-muted">
                        {group.rows.map(([feature, value]) => {
                          const v = Number(value);
                          const pct = (Math.abs(v) / maxVal) * 100;
                          const color = v >= 0 ? "#DD2A7B" : "#4FC3E8";
                          return (
                            <div key={feature}>
                              <div className="flex items-center justify-between gap-4">
                                <span className="truncate">{feature}</span>
                                <span className="font-mono text-ink">{v.toFixed(3)}</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[rgba(17,17,27,0.05)]">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pct}%`, backgroundColor: color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </FadeIn>

          <FadeIn>
            <ChartCard
              eyebrow="Scored rows"
              title="Prediction preview"
              description="First 50 scored rows. Download the full batch as CSV for offline inspection."
              action={
                <button
                  onClick={() =>
                    downloadCsv(instagramPrediction.export_rows, "instagram_batch_scoring_results.csv")
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-[rgba(17,17,27,0.025)] px-4 py-2 text-sm font-semibold text-ink transition hover:border-[rgba(221,42,123,0.3)]"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </button>
              }
            >
              <div className="max-w-full overflow-x-auto pb-2">
                <table className="min-w-[880px] w-full border-separate border-spacing-y-2 text-left text-xs text-muted sm:text-sm">
                  <thead>
                    <tr>
                      {Object.keys(instagramPrediction.preview_rows[0] ?? {}).map((key) => (
                        <th key={key} className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {instagramPrediction.preview_rows.map((row, index) => (
                      <tr key={index} className="rounded-2xl bg-[rgba(17,17,27,0.025)] text-ink">
                        {Object.entries(row).map(([key, value]) => (
                          <td key={key} className="px-3 py-3 align-top first:rounded-l-2xl last:rounded-r-2xl">
                            {typeof value === "number"
                              ? Number.isInteger(value)
                                ? value.toLocaleString()
                                : value.toFixed(3)
                              : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </FadeIn>
        </>
      )}
    </div>
  );
}
