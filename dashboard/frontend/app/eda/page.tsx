"use client";

import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { Activity, Flame, Sparkles, TrendingUp } from "lucide-react";

import { ChartCard } from "../../components/chart-card";
import { EChart } from "../../components/echart";
import { AnimatedCounter } from "../../components/animated-counter";
import { FadeIn, MotionDiv, StaggerChildren, staggerItemVariants } from "../../components/motion";
import { HEATMAP_RANGE_IG } from "../../lib/chart-theme";
import { addVisualSpread, getValueExtent, pickHighlightedKeys } from "../../lib/scatter-helpers";
import { getAdvanced, getEda, type AdvancedPayload, type EdaPayload } from "../../lib/api";

const GEN_ORDER = ["Gen Alpha", "Gen Z", "Millennial", "Gen X", "Boomer+"];

const IG_COLORS = ["#F58529", "#DD2A7B", "#8134AF", "#4FC3E8", "#FFD4B5"];

export default function EdaPage() {
  const [eda, setEda] = useState<EdaPayload | null>(null);
  const [advanced, setAdvanced] = useState<AdvancedPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [e, a] = await Promise.all([getEda(), getAdvanced().catch(() => null)]);
        if (!cancelled) {
          setEda(e);
          setAdvanced(a);
        }
      } catch {
        if (!cancelled) setEda(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derive per-generation usage-surface split using global usage_metrics proportions
  // scaled by each generation's average daily minutes. This surfaces the same
  // relative balance but makes the per-generation heaviness visible.
  const surfaceByGeneration = useMemo(() => {
    if (!eda) return null;
    const surfaces = [
      { key: "time_on_feed_per_day", label: "Feed", color: "#F58529" },
      { key: "time_on_reels_per_day", label: "Reels", color: "#DD2A7B" },
      { key: "time_on_stories_per_day", label: "Stories", color: "#8134AF" },
      { key: "time_on_explore_per_day", label: "Explore", color: "#4FC3E8" },
      { key: "time_on_messages_per_day", label: "Messages", color: "#FFD4B5" },
    ];
    const totalGlobal =
      surfaces.reduce((acc, s) => acc + (Number(eda.usage_metrics[s.key]) || 0), 0) || 1;
    const props = surfaces.map((s) => ({
      ...s,
      share: (Number(eda.usage_metrics[s.key]) || 0) / totalGlobal,
    }));
    const rows = GEN_ORDER.filter((g) => g in eda.usage_by_generation).map((gen) => {
      const total = Number(eda.usage_by_generation[gen]) || 0;
      return {
        generation: gen,
        total,
        segments: props.map((p) => ({ label: p.label, color: p.color, minutes: total * p.share })),
      };
    });
    return { rows, surfaces: props };
  }, [eda]);

  if (!eda) {
    return (
      <div className="surface-panel p-8">
        <p className="eyebrow">Exploration</p>
        <h1 className="font-display mt-4 text-3xl italic tracking-[-0.03em] text-ink">EDA Explorer</h1>
        <p className="mt-4 text-sm text-muted">The exploratory payload is still loading.</p>
      </div>
    );
  }

  const ageEntries = Object.entries(eda.age_histogram)
    .map(([age, count]) => [Number(age), Number(count)] as const)
    .sort((a, b) => a[0] - b[0]);
  const countryEntries = Object.entries(eda.country_distribution).slice(0, 15);
  const contentThemeEntries = Object.entries(eda.content_theme_distribution).slice(0, 10);
  const contentTypeEntries = Object.entries(eda.content_type_distribution);
  const genderEntries = Object.entries(eda.gender_distribution);
  const genderTotal = genderEntries.reduce((a, [, v]) => a + Number(v), 0) || 1;
  const totalUsers = Object.values(eda.age_histogram).reduce((a, v) => a + Number(v), 0);
  const avgDaily = Number(eda.usage_metrics.daily_active_minutes_instagram ?? 0);
  const countryScatter = (advanced?.country_analysis ?? []).slice(0, 20);
  const countryMinuteExtent = getValueExtent(
    countryScatter.map((country) => Number(country.avg_minutes)),
    { minimumPad: 2, precision: 1 },
  );
  const countryEngagementExtent = getValueExtent(
    countryScatter.map((country) => Number(country.avg_engagement)),
    { minimumPad: 1.5, precision: 1 },
  );
  const countryScatterPoints = addVisualSpread(
    countryScatter.map((country) => ({
      key: String(country.country),
      country: String(country.country),
      x: Number(country.avg_minutes),
      y: Number(country.avg_engagement),
      size: Number(country.user_count),
    })),
    Math.max(0.18, (countryMinuteExtent.max - countryMinuteExtent.min) * 0.014),
    Math.max(0.08, (countryEngagementExtent.max - countryEngagementExtent.min) * 0.012),
  );
  const highlightedCountryKeys = pickHighlightedKeys(countryScatterPoints, 5);
  const countryScatterData = countryScatterPoints.map((point) => ({
    name: point.country,
    country: point.country,
    size: point.size,
    actualMinutes: point.x,
    actualEngagement: point.y,
    value: [point.plottedX, point.plottedY, point.size],
  }));

  const ageOption: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 14, right: 14, top: 10, bottom: 18, containLabel: true },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: ageEntries.map(([age]) => age),
      axisLabel: { color: "#7A7A88", fontSize: 10 },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#7A7A88", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: ageEntries.map(([, count]) => count),
        symbol: "none",
        lineStyle: {
          width: 3,
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "#F58529" },
              { offset: 0.5, color: "#DD2A7B" },
              { offset: 1, color: "#8134AF" },
            ],
          },
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(221,42,123,0.32)" },
              { offset: 1, color: "rgba(221,42,123,0.02)" },
            ],
          },
        },
      },
    ],
  };

  // Country as horizontal bar with gradient tinted by rank
  const countryOption: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 10, right: 10, top: 8, bottom: 12, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: {
      type: "value",
      axisLabel: { color: "#7A7A88", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
    },
    yAxis: {
      type: "category",
      data: countryEntries.map(([name]) => name).reverse(),
      axisLabel: { color: "#141420", fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: countryEntries.map(([, v]) => Number(v)).reverse(),
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "#F58529" },
              { offset: 1, color: "#8134AF" },
            ],
          },
          borderRadius: [0, 10, 10, 0],
        },
      },
    ],
  };

  // Stratified happiness heatmap (stress_group × usage_group)
  const stratified = advanced?.stratified_happiness ?? [];
  const stressGroups = Array.from(new Set(stratified.map((r) => String(r.stress_group))));
  const usageGroups = Array.from(new Set(stratified.map((r) => String(r.usage_group))));
  const heatmapData = stratified.map((r) => [
    usageGroups.indexOf(String(r.usage_group)),
    stressGroups.indexOf(String(r.stress_group)),
    Number(r.avg_happiness ?? 0),
  ]);
  const happinessMin = heatmapData.length
    ? Math.min(...heatmapData.map((d) => Number(d[2])))
    : 0;
  const happinessMax = heatmapData.length
    ? Math.max(...heatmapData.map((d) => Number(d[2])))
    : 10;
  const stratifiedOption: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 12, right: 12, top: 26, bottom: 48, containLabel: true },
    tooltip: {
      position: "top",
      formatter: (p: any) =>
        `<b>${usageGroups[p.data[0]]}</b> × <b>${stressGroups[p.data[1]]}</b><br/>Happiness: ${Number(p.data[2]).toFixed(2)}`,
    },
    xAxis: {
      type: "category",
      data: usageGroups,
      splitArea: { show: true },
      axisLabel: { color: "#141420", fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: stressGroups,
      splitArea: { show: true },
      axisLabel: { color: "#141420", fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: happinessMin,
      max: happinessMax,
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
        data: heatmapData,
        label: {
          show: true,
          formatter: (p: any) => Number(p.data[2]).toFixed(2),
          color: "#141420",
          fontSize: 11,
          fontWeight: 600,
        },
        itemStyle: { borderRadius: 8, borderColor: "#FFFFFF", borderWidth: 3 },
      },
    ],
  };

  // Normalized stacked bar — surface split per generation (rows = generations, segments = surfaces)
  const stackedOption: EChartsOption | null = surfaceByGeneration
    ? {
        backgroundColor: "transparent",
        grid: { left: 8, right: 8, top: 32, bottom: 18, containLabel: true },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          formatter: (params: any) =>
            `<b>${params[0].axisValue}</b><br/>` +
            params
              .map(
                (p: any) =>
                  `<span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${p.color};margin-right:6px"></span>${p.seriesName}: ${Number(p.value).toFixed(1)} min`,
              )
              .join("<br/>"),
        },
        legend: {
          top: 0,
          left: "center",
          textStyle: { color: "#7A7A88", fontSize: 10 },
          itemWidth: 10,
          itemHeight: 10,
        },
        xAxis: {
          type: "value",
          axisLabel: { color: "#7A7A88", fontSize: 10, formatter: "{value}m" },
          splitLine: { lineStyle: { color: "rgba(17,17,27,0.05)" } },
        },
        yAxis: {
          type: "category",
          data: surfaceByGeneration.rows.map((r) => r.generation),
          axisLabel: { color: "#141420", fontSize: 11 },
          axisLine: { show: false },
          axisTick: { show: false },
        },
        series: surfaceByGeneration.surfaces.map((s, i) => ({
          name: s.label,
          type: "bar",
          stack: "total",
          data: surfaceByGeneration.rows.map((r) => r.segments[i].minutes),
          itemStyle: { color: s.color },
          barWidth: 26,
        })),
      }
    : null;

  // Themes as horizontal gradient bars — relative intensity instead of flat fill
  const maxTheme = Math.max(...contentThemeEntries.map(([, v]) => Number(v)));
  const themeOption: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 10, right: 14, top: 8, bottom: 10, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: {
      type: "value",
      axisLabel: { color: "#7A7A88", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
    },
    yAxis: {
      type: "category",
      data: contentThemeEntries.map(([name]) => name).reverse(),
      axisLabel: { color: "#141420", fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: contentThemeEntries.map(([, v]) => Number(v)).reverse(),
        itemStyle: {
          color: (p: any) => {
            const ratio = Number(p.value) / maxTheme;
            const opacity = 0.35 + ratio * 0.55;
            return `rgba(129,52,175,${opacity.toFixed(2)})`;
          },
          borderRadius: [0, 10, 10, 0],
        },
        label: {
          show: true,
          position: "right",
          formatter: (p: any) => Number(p.value).toLocaleString(),
          color: "#7A7A88",
          fontSize: 10,
        },
      },
    ],
  };

  // Content types — donut with modern arc labels
  const contentTypeTotal = contentTypeEntries.reduce((a, [, v]) => a + Number(v), 0) || 1;
  const contentTypeOption: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: (p: any) => `${p.name}: ${((p.value / contentTypeTotal) * 100).toFixed(1)}%`,
    },
    series: [
      {
        type: "pie",
        radius: ["52%", "78%"],
        center: ["50%", "54%"],
        padAngle: 3,
        itemStyle: { borderRadius: 6, borderColor: "#FFFFFF", borderWidth: 2 },
        label: {
          position: "outside",
          formatter: "{b}\n{d}%",
          color: "#141420",
          fontSize: 11,
        },
        labelLine: { length: 10, length2: 14, smooth: true },
        data: contentTypeEntries.map(([name, value], i) => ({
          name,
          value: Number(value),
          itemStyle: { color: IG_COLORS[i % IG_COLORS.length] },
        })),
      },
    ],
  };

  // Country engagement (from advanced) — scatter with engagement vs minutes
  const countryScatterOption: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 10, right: 10, top: 18, bottom: 28, containLabel: true },
    tooltip: {
      trigger: "item",
      formatter: (p: any) =>
        `<b>${String(p.data.country)}</b><br/>Avg minutes: ${Number(p.data.actualMinutes).toFixed(1)}<br/>Avg engagement: ${Number(p.data.actualEngagement).toFixed(1)}<br/>Users: ${Number(p.data.size).toLocaleString()}`,
    },
    xAxis: {
      type: "value",
      name: "Avg daily minutes",
      min: countryMinuteExtent.min,
      max: countryMinuteExtent.max,
      nameGap: 22,
      nameTextStyle: { color: "#7A7A88", fontSize: 10 },
      axisLabel: { color: "#7A7A88", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(17,17,27,0.05)" } },
    },
    yAxis: {
      type: "value",
      name: "Engagement",
      min: countryEngagementExtent.min,
      max: countryEngagementExtent.max,
      nameTextStyle: { color: "#7A7A88", fontSize: 10 },
      axisLabel: { color: "#7A7A88", fontSize: 10 },
      splitLine: { lineStyle: { color: "rgba(17,17,27,0.05)" } },
    },
    series: [
      {
        type: "scatter",
        symbolSize: (value) => 7 + Math.sqrt(Number((value as number[])[2])) / 5,
        data: countryScatterData,
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(245,133,41,0.85)" },
              { offset: 1, color: "rgba(129,52,175,0.85)" },
            ],
          },
          borderColor: "#FFFFFF",
          borderWidth: 1,
        },
        emphasis: { scale: true },
      },
      {
        type: "scatter",
        data: countryScatterData.filter((point) => highlightedCountryKeys.has(point.country)),
        symbolSize: (value) => 10 + Math.sqrt(Number((value as number[])[2])) / 5,
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

  return (
    <div className="max-w-full space-y-8 overflow-x-hidden">
      {/* HERO */}
      <FadeIn>
        <div className="surface-panel overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1.2fr,1fr]">
            <div className="px-6 py-8 sm:px-10 sm:py-10">
              <p className="eyebrow">Exploration</p>
              <h1 className="font-display mt-4 text-4xl italic leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">
                The <span className="ig-gradient-text">shape of the sample</span>.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
                Demographics, usage intensity, content preferences, and generational patterns — the synthetic dataset is engineered for balance, so most marginal distributions look close to uniform. The richer stories live in the <span className="font-semibold text-ink">cohort interactions</span> below.
              </p>
            </div>
            <div className="relative min-h-[200px] overflow-hidden lg:min-h-[320px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/cool-teen-young-woman-pink-hoodie-stylish-sunglasses-takes-selfie-holds-phone-poses-with-headphones-outside.jpg"
                alt="Instagram user taking a selfie outdoors"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(129,52,175,0.55)] via-[rgba(221,42,123,0.35)] to-[rgba(245,133,41,0.25)] mix-blend-multiply" />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/30 to-transparent lg:from-white lg:via-white/15" />
            </div>
          </div>
        </div>
      </FadeIn>

      {/* STAT BANNER */}
      <StaggerChildren className="grid gap-4 md:grid-cols-4" stagger={0.08}>
        <MotionDiv variants={staggerItemVariants} className="surface-panel p-5">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Users in sample</p>
            <TrendingUp className="h-4 w-4 text-[#DD2A7B]" />
          </div>
          <div className="font-display mt-3 text-3xl italic tracking-tight text-ink">
            <AnimatedCounter value={totalUsers} />
          </div>
        </MotionDiv>
        <MotionDiv variants={staggerItemVariants} className="surface-panel p-5">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Countries</p>
            <Activity className="h-4 w-4 text-[#8134AF]" />
          </div>
          <div className="font-display mt-3 text-3xl italic tracking-tight text-ink">
            <AnimatedCounter value={Object.keys(eda.country_distribution).length} />
          </div>
        </MotionDiv>
        <MotionDiv variants={staggerItemVariants} className="surface-panel p-5">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Avg daily minutes</p>
            <Flame className="h-4 w-4 text-[#F58529]" />
          </div>
          <div className="font-display mt-3 text-3xl italic tracking-tight text-ink">
            <AnimatedCounter value={avgDaily} decimals={1} />
          </div>
        </MotionDiv>
        <MotionDiv variants={staggerItemVariants} className="surface-panel p-5">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Content themes</p>
            <Sparkles className="h-4 w-4 text-[#4FC3E8]" />
          </div>
          <div className="font-display mt-3 text-3xl italic tracking-tight text-ink">
            <AnimatedCounter value={Object.keys(eda.content_theme_distribution).length} />
          </div>
        </MotionDiv>
      </StaggerChildren>

      {/* Section 1 — Demographics */}
      <FadeIn>
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <ChartCard
            eyebrow="Demographics"
            title="Age distribution"
            description="The sample leans young — Gen Z and Millennial cohorts dominate."
          >
            <EChart option={ageOption} height={300} />
          </ChartCard>
          <div className="surface-panel flex flex-col p-6">
            <p className="eyebrow">Gender mix</p>
            <h3 className="font-display mt-3 text-xl italic tracking-tight text-ink">
              A nearly balanced sample
            </h3>
            <p className="mt-2 text-xs leading-5 text-muted">
              Gender is near-uniform across the dataset. Segmented view instead of a flat donut.
            </p>
            <div className="mt-5 space-y-3">
              {genderEntries.map(([name, value], i) => {
                const pct = (Number(value) / genderTotal) * 100;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink">{name}</span>
                      <span className="text-muted">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[rgba(17,17,27,0.04)]">
                      <MotionDiv
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 1.1, delay: i * 0.08, ease: [0.22, 0.61, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: IG_COLORS[i % IG_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Section 2 — Geography */}
      <FadeIn>
        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <ChartCard
            eyebrow="Geography"
            title="Top countries by user count"
            description="The 15 most represented countries in the sample."
          >
            <EChart option={countryOption} height={380} />
          </ChartCard>
          <ChartCard
            eyebrow="Geography × behavior"
            title="Usage vs engagement, by country"
            description="Each bubble is a country; size = user count. Note how engagement tracks with daily minutes."
          >
            <EChart option={countryScatterOption} height={380} />
          </ChartCard>
        </div>
      </FadeIn>

      {/* Section 3 — How generations spend their day */}
      <FadeIn>
        <ChartCard
          eyebrow="Cohorts"
          title="How each generation spends their minutes"
          description="Total bar length = average daily Instagram minutes for that generation. Segments split by surface (feed / reels / stories / explore / messages) using sample-wide surface shares."
        >
          {stackedOption && <EChart option={stackedOption} height={300} />}
        </ChartCard>
      </FadeIn>

      {/* Section 4 — Stratified heatmap (the star of the page) */}
      <FadeIn>
        <div className="surface-panel p-7 sm:p-9">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Cohort interaction</p>
              <h2 className="mt-3 font-display text-3xl italic tracking-[-0.03em] text-ink sm:text-4xl">
                Where <span className="ig-gradient-text">happiness lives</span>
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Average happiness by usage intensity × stress tercile. Darker = higher happiness. The pattern is remarkably consistent:
                <span className="font-semibold text-ink"> lower usage and lower stress cells carry the brightest outcomes</span>.
              </p>
            </div>
          </div>
          <div className="mt-6">
            {heatmapData.length > 0 ? (
              <EChart option={stratifiedOption} height={320} />
            ) : (
              <p className="text-sm text-muted">Cohort heatmap loads once the advanced payload is ready.</p>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Section 5 — Content preferences */}
      <FadeIn>
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <ChartCard
            eyebrow="Themes"
            title="Top content themes"
            description="Opacity encodes relative intensity — color stays on-brand."
          >
            <EChart option={themeOption} height={360} />
          </ChartCard>
          <ChartCard
            eyebrow="Format"
            title="Content-type preferences"
            description="Photos, videos, reels, stories, and mixed content — percentage of users per primary format."
          >
            <EChart option={contentTypeOption} height={360} />
          </ChartCard>
        </div>
      </FadeIn>

      {/* Section 6 — Key findings */}
      <FadeIn>
        <div className="surface-panel p-7 sm:p-9">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Synthesis</p>
              <h2 className="mt-3 font-display text-3xl italic tracking-[-0.03em] text-ink sm:text-4xl">
                What the data <span className="ig-gradient-text">keeps telling us</span>
              </h2>
            </div>
          </div>
          <StaggerChildren className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4" stagger={0.08}>
            {[
              {
                eyebrow: "Demographics",
                title: "Countries and gender look uniform",
                body: "The sample was engineered for balance — marginal distributions are nearly flat. Cohort interactions carry the signal.",
                color: "#F58529",
              },
              {
                eyebrow: "Usage",
                title: "Daily minutes is the clearest differentiator",
                body: "Everything downstream — stress, engagement, addiction risk — leans on session intensity.",
                color: "#DD2A7B",
              },
              {
                eyebrow: "Content",
                title: "Themes are broadly spread",
                body: "No single theme dominates. Category effects on outcomes are modest compared to usage effects.",
                color: "#8134AF",
              },
              {
                eyebrow: "Generations",
                title: "Younger cohorts run hotter",
                body: "Gen Z + Millennials show the highest daily minutes and the strongest Reels skew.",
                color: "#4FC3E8",
              },
            ].map((c) => (
              <MotionDiv
                key={c.title}
                variants={staggerItemVariants}
                className="relative rounded-[22px] border border-black/[0.05] bg-white p-5"
              >
                <div className="absolute left-0 top-5 h-8 w-1 rounded-r-full" style={{ backgroundColor: c.color }} />
                <p className="eyebrow pl-2" style={{ color: c.color }}>
                  {c.eyebrow}
                </p>
                <p className="mt-3 pl-2 text-base font-semibold leading-tight text-ink">{c.title}</p>
                <p className="mt-2 pl-2 text-xs leading-5 text-muted">{c.body}</p>
              </MotionDiv>
            ))}
          </StaggerChildren>
        </div>
      </FadeIn>
    </div>
  );
}