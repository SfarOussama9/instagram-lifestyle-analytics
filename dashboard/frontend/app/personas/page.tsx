"use client";

import { useEffect, useState } from "react";
import type { EChartsOption } from "echarts";

import { ChartCard } from "../../components/chart-card";
import { EChart } from "../../components/echart";
import { SectionHero } from "../../components/section-hero";
import { getClusters, type ClustersPayload } from "../../lib/api";

export default function PersonasPage() {
  const [clusters, setClusters] = useState<ClustersPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const payload = await getClusters();
        if (!cancelled) {
          setClusters(payload);
        }
      } catch {
        if (!cancelled) {
          setClusters(null);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!clusters) {
    return (
      <div className="surface-panel p-8">
        <SectionHero title="Personas" description="Cluster payload is still warming up. The persona layer will appear once the trained artifacts are ready." eyebrow="Personas" />
      </div>
    );
  }

  const shares = Object.entries(clusters.share_by_persona);
  const personaByCluster = Object.fromEntries(
    Object.entries(clusters.definitions).map(([clusterId, definition]) => [Number(clusterId), definition]),
  );
  const shareOption: EChartsOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { color: "#7A7A88" } },
    series: [
      {
        type: "pie",
        radius: ["46%", "74%"],
        center: ["50%", "42%"],
        label: { color: "#141420" },
        itemStyle: { borderColor: "#FFFFFF", borderWidth: 4 },
        data: shares.map(([name, value], index) => ({
          name,
          value,
          itemStyle: { color: Object.values(personaByCluster)[index]?.color ?? ["#DD2A7B", "#8134AF", "#4FC3E8", "#F58529"][index % 4] },
        })),
      },
    ],
  };

  const radarMetrics = [
    "daily_active_minutes_instagram",
    "creator_score",
    "consumer_score",
    "wellness_index",
    "social_butterfly_index",
    "addiction_risk_score",
  ];
  const radarLabels = ["Minutes", "Creator", "Consumer", "Wellness", "Social", "Risk"];
  const radarOption: EChartsOption = {
    backgroundColor: "transparent",
    legend: { bottom: 0, textStyle: { color: "#7A7A88" } },
    radar: {
      radius: "58%",
      indicator: radarMetrics.map((metric, index) => ({
        name: radarLabels[index],
        max: Math.max(...clusters.cluster_profiles.map((profile) => Number(profile[metric] ?? 0))) * 1.1,
      })),
      splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } },
      splitArea: { areaStyle: { color: ["transparent"] } },
      axisName: { color: "#7A7A88" },
    },
    series: [
      {
        type: "radar",
        data: clusters.cluster_profiles.map((profile) => {
          const clusterId = Number(profile.cluster);
          const definition = personaByCluster[clusterId];

          return {
            name: definition?.name ?? `Cluster ${clusterId}`,
            value: radarMetrics.map((metric) => Number(profile[metric] ?? 0)),
            areaStyle: { color: `${definition?.color ?? "#DD2A7B"}20` },
            lineStyle: { color: definition?.color ?? "#DD2A7B", width: 2 },
            itemStyle: { color: definition?.color ?? "#DD2A7B" },
          };
        }),
      },
    ],
  };

  const pcaOption: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 14, right: 14, top: 20, bottom: 20, containLabel: true },
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        const value = Array.isArray(params?.value) ? params.value : [];
        return `${String(params?.seriesName ?? "Persona")}<br/>PC1: ${Number(value[0] ?? 0).toFixed(2)}<br/>PC2: ${Number(value[1] ?? 0).toFixed(2)}`;
      },
    },
    xAxis: { type: "value", axisLabel: { color: "#7A7A88" }, splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } } },
    yAxis: { type: "value", axisLabel: { color: "#7A7A88" }, splitLine: { lineStyle: { color: "rgba(17,17,27,0.06)" } } },
    series: Object.values(personaByCluster).map((definition) => ({
      type: "scatter",
      name: definition.name,
      symbolSize: 8,
      itemStyle: { color: definition.color, opacity: 0.45 },
      data: clusters.pca_sample
        .filter((row) => row.persona === definition.name)
        .map((row) => [Number(row.pc1 ?? 0), Number(row.pc2 ?? 0)]),
    })),
  };

  return (
    <div className="space-y-6">
      <div className="surface-panel p-8">
        <SectionHero title="User Personas" description="K-Means clustering on 15 behavioral and engineered features separates the sample into six recurring personas, summarized by share, profile shape, and PCA projection." eyebrow="Segmentation" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ChartCard eyebrow="Share" title="Persona mix" description="Population share of the six personas identified in the clustering stage.">
          <EChart option={shareOption} height={360} />
        </ChartCard>

        <ChartCard eyebrow="Projection" title="PCA projection" description="Two-dimensional projection of the clustered sample, colored by persona assignment.">
          <EChart option={pcaOption} height={360} />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ChartCard eyebrow="Behavioral shape" title="Radar profile comparison" description="Each personaâ€™s relative position on usage, creation, consumption, wellness, sociality, and risk.">
          <EChart option={radarOption} height={400} />
        </ChartCard>

        <ChartCard eyebrow="Scale" title="Segmentation summary" description="Reference counts for the clustering payload shown on this page.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-black/[0.08] bg-[rgba(17,17,27,0.03)] p-5">
              <p className="eyebrow">PCA sample</p>
              <p className="metric-value mt-4 text-4xl text-ink">{clusters.pca_sample.length.toLocaleString()}</p>
            </div>
            <div className="rounded-[24px] border border-black/[0.08] bg-[rgba(17,17,27,0.03)] p-5">
              <p className="eyebrow">Distinct personas</p>
              <p className="metric-value mt-4 text-4xl text-ink">{shares.length}</p>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {clusters.cluster_profiles.map((profile) => {
          const clusterId = Number(profile.cluster);
          const definition = personaByCluster[clusterId];

          return (
            <div key={clusterId} className="surface-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Persona {clusterId + 1}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">{definition?.emoji} {definition?.name ?? `Cluster ${clusterId}`}</h3>
                </div>
                <div className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] text-canvas" style={{ backgroundColor: definition?.color ?? "#DD2A7B" }}>
                  {clusters.share_by_persona[definition?.name ?? ""]?.toFixed(1) ?? "0.0"}%
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm text-muted">
                <div className="rounded-[20px] border border-black/[0.08] bg-[rgba(17,17,27,0.03)] p-4">
                  <p>Daily minutes</p>
                  <p className="metric-value mt-2 text-xl text-ink">{Number(profile.daily_active_minutes_instagram).toFixed(1)}</p>
                </div>
                <div className="rounded-[20px] border border-black/[0.08] bg-[rgba(17,17,27,0.03)] p-4">
                  <p>Happiness</p>
                  <p className="metric-value mt-2 text-xl text-ink">{Number(profile.self_reported_happiness).toFixed(1)}</p>
                </div>
                <div className="rounded-[20px] border border-black/[0.08] bg-[rgba(17,17,27,0.03)] p-4">
                  <p>Stress</p>
                  <p className="metric-value mt-2 text-xl text-ink">{Number(profile.perceived_stress_score).toFixed(1)}</p>
                </div>
                <div className="rounded-[20px] border border-black/[0.08] bg-[rgba(17,17,27,0.03)] p-4">
                  <p>Followers</p>
                  <p className="metric-value mt-2 text-xl text-ink">{Number(profile.followers_count).toFixed(0)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
