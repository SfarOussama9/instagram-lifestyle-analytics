"use client";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

type Props = {
  option: EChartsOption;
  height?: number;
  className?: string;
};

export function EChart({ option, height = 320, className }: Props) {
  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      className={className}
      style={{ height, width: "100%", minWidth: 0 }}
      opts={{ renderer: "canvas" }}
    />
  );
}