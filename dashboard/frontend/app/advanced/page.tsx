"use client";

import { useEffect, useState } from "react";
import type { EChartsOption } from "echarts";

import { ChartCard } from "../../components/chart-card";
import { EChart } from "../../components/echart";
import { SectionHero } from "../../components/section-hero";
import { getAdvanced, type AdvancedPayload } from "../../lib/api";
import { addVisualSpread, getValueExtent, pickHighlightedKeys } from "../../lib/scatter-helpers";

function formatSummaryLabel(key: string) {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AdvancedPage() {
  const [advanced, setAdvanced] = useState<AdvancedPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const payload = await getAdvanced();
        if (!cancelled) {
          setAdvanced(payload);
        }
      } catch {
        if (!cancelled) {
          setAdvanced(null);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!advanced) {
    return (
      <div className="surface-panel p-8">
        <SectionHero title="Advanced Analysis" description="Advanced payload is still warming up. Cohort, geography, and stratified diagnostics will appear once the trained artifacts are available." eyebrow="Advanced" />
      </div>
    );
  }

  const geographyStressExtent = getValueExtent(
    advanced.country_analysis.map((row) => Number(row.avg_stress)),
    { minimumPad: 1.2, precision: 1 },
  );
  const geographyHappinessExtent = getValueExtent(
    advanced.country_analysis.map((row) => Number(row.avg_happiness)),
    { minimumPad: 0.25, precision: 2 },
  );
  const geographyPoints = addVisualSpread(
    advanced.country_analysis.map((row) => ({
      key: String(row.country),
      country: String(row.country),
      x: Number(row.avg_stress),
      y: Number(row.avg_happiness),
      size: Number(row.user_count),
    })),
    Math.max(0.12, (geographyStressExtent.max - geographyStressExtent.min) * 0.012),
    Math.max(0.05, (geographyHappinessExtent.max - geographyHappinessExtent.min) * 0.012),
  );
  const highlightedGeographyKeys = pickHighlightedKeys(geographyPoints, 6);
  const geographyData = geographyPoints.map((point) => ({
    name: point.country,
    country: point.country,
    size: point.size,
    actualStress: point.x,
    actualHappiness: point.y,
    value: [point.plottedX, point.plottedY, point.size],
  }));

  const cohortOption: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    legend: { top: 0, textStyle: { color: "#7A7A88" } },
    grid: { left: 14, right: 14, top: 50, bottom: 18, containLabel: true },
    xAxis: {
      type: "category",
      data: advanced.cohort_analysis.map((row) => String(row.account_creation_year)),
      axisLabel: { color: "#7A7A88" },
    },
    yAxis: [
      { type: "value", axisLabel: { color: "#7A7A88" }, splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } } },
      { type: "value", axisLabel: { color: "#7A7A88" }, splitLine: { show: false } },
    ],
    series: [
      { name: "Minutes", type: "line", smooth: true, data: advanced.cohort_analysis.map((row) => Number(row.avg_minutes)), lineStyle: { color: "#DD2A7B", width: 3 }, symbol: "none" },
      { name: "Happiness", type: "line", smooth: true, yAxisIndex: 1, data: advanced.cohort_analysis.map((row) => Number(row.avg_happiness)), lineStyle: { color: "#4FC3E8", width: 2 }, symbol: "none" },
      { name: "Stress", type: "line", smooth: true, yAxisIndex: 1, data: advanced.cohort_analysis.map((row) => Number(row.avg_stress)), lineStyle: { color: "#8134AF", width: 2 }, symbol: "none" },
    ],
  };

  const geographyOption: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 18, right: 18, top: 18, bottom: 18, containLabel: true },
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        const row = params?.data;
        return `${String(row?.country ?? params?.name ?? "Country")}<br/>Stress: ${Number(row?.actualStress ?? 0).toFixed(2)}<br/>Happiness: ${Number(row?.actualHappiness ?? 0).toFixed(2)}<br/>Users: ${Number(row?.size ?? 0).toLocaleString()}`;
      },
    },
    xAxis: {
      type: "value",
      name: "Stress",
      min: geographyStressExtent.min,
      max: geographyStressExtent.max,
      axisLabel: { color: "#7A7A88" },
      splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
    },
    yAxis: {
      type: "value",
      name: "Happiness",
      min: geographyHappinessExtent.min,
      max: geographyHappinessExtent.max,
      axisLabel: { color: "#7A7A88" },
      splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
    },
    series: [
      {
        type: "scatter",
        data: geographyData,
        symbolSize: (value) => Math.max(10, Math.min(30, Math.sqrt(Number((value as number[])[2])) / 6)),
        itemStyle: { color: "#DD2A7B", opacity: 0.7 },
        emphasis: { scale: true },
      },
      {
        type: "scatter",
        data: geographyData.filter((point) => highlightedGeographyKeys.has(point.country)),
        symbolSize: (value) => Math.max(12, Math.min(34, Math.sqrt(Number((value as number[])[2])) / 5.5)),
        itemStyle: { color: "rgba(221,42,123,0.92)", borderColor: "#FFFFFF", borderWidth: 2 },
        label: {
          show: true,
          position: "top",
          distance: 6,
          color: "#7A7A88",
          backgroundColor: "rgba(255,255,255,0.9)",
          borderRadius: 999,
          padding: [3, 6],
          formatter: (params: any) => String(params.data.country),
        },
        labelLayout: { hideOverlap: true, moveOverlap: "shiftY" },
      },
    ],
  };

  const urbanOption: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 0, textStyle: { color: "#7A7A88" } },
    grid: { left: 14, right: 14, top: 48, bottom: 18, containLabel: true },
    xAxis: { type: "category", data: advanced.urban_rural.map((row) => String(row.urban_rural)), axisLabel: { color: "#7A7A88" } },
    yAxis: { type: "value", axisLabel: { color: "#7A7A88" }, splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } } },
    series: [
      { name: "Minutes", type: "bar", data: advanced.urban_rural.map((row) => Number(row.avg_minutes)), itemStyle: { color: "#8134AF", borderRadius: [12, 12, 0, 0] } },
      { name: "Happiness", type: "bar", data: advanced.urban_rural.map((row) => Number(row.avg_happiness)), itemStyle: { color: "#4FC3E8", borderRadius: [12, 12, 0, 0] } },
      { name: "Stress", type: "bar", data: advanced.urban_rural.map((row) => Number(row.avg_stress)), itemStyle: { color: "#DD2A7B", borderRadius: [12, 12, 0, 0] } },
    ],
  };

  const stressGroups = [...new Set(advanced.stratified_happiness.map((row) => String(row.stress_group)))];
  const usageGroups = [...new Set(advanced.stratified_happiness.map((row) => String(row.usage_group)))];
  const heatmapOption: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: { position: "top" },
    grid: { left: 70, right: 18, top: 18, bottom: 32 },
    xAxis: { type: "category", data: usageGroups, axisLabel: { color: "#7A7A88" }, splitArea: { show: true } },
    yAxis: { type: "category", data: stressGroups, axisLabel: { color: "#7A7A88" }, splitArea: { show: true } },
    visualMap: {
      min: Math.min(...advanced.stratified_happiness.map((row) => Number(row.avg_happiness))),
      max: Math.max(...advanced.stratified_happiness.map((row) => Number(row.avg_happiness))),
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      textStyle: { color: "#7A7A88" },
      inRange: { color: ["#FFE8F1", "#4FC3E8", "#DD2A7B"] },
    },
    series: [
      {
        type: "heatmap",
        data: advanced.stratified_happiness.map((row) => [
          usageGroups.indexOf(String(row.usage_group)),
          stressGroups.indexOf(String(row.stress_group)),
          Number(row.avg_happiness),
        ]),
        label: { show: true, color: "#141420", formatter: ({ value }) => Number((value as number[])[2]).toFixed(2) },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="surface-panel p-8">
        <SectionHero title="Advanced Analysis" description="This section extends the core findings with cohort trends, geographic comparisons, and stratified happiness patterns across usage and stress groups." eyebrow="Diagnostics" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {Object.entries(advanced.summary).map(([key, value]) => (
          <div key={key} className="surface-panel p-6">
            <p className="eyebrow">Summary metric</p>
            <p className="mt-4 text-sm text-muted">{formatSummaryLabel(key)}</p>
            <p className="metric-value mt-2 text-3xl text-ink">{typeof value === "number" ? value.toFixed(3) : String(value ?? "-")}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard eyebrow="Cohorts" title="Account creation year trends" description="Average usage intensity, happiness, and stress by account-creation year.">
          <EChart option={cohortOption} height={360} />
        </ChartCard>

        <ChartCard eyebrow="Geography" title="Country comparison" description="Countries positioned by average stress and happiness, with marker size proportional to sample size.">
          <EChart option={geographyOption} height={360} />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard eyebrow="Area split" title="Urban vs rural" description="Grouped comparison of usage intensity and well-being across urban and rural users.">
          <EChart option={urbanOption} height={340} />
        </ChartCard>
        <ChartCard eyebrow="Stratified view" title="Happiness by usage and stress bucket" description="Average happiness within comparable usage bands and stress strata.">
          <EChart option={heatmapOption} height={340} />
        </ChartCard>
      </div>
    </div>
  );
}
