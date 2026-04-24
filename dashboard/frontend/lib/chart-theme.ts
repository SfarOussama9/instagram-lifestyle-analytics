// Shared light-theme chart palette for ECharts options across the dashboard.

export const CHART_PALETTE = [
  "#DD2A7B", // Instagram pink
  "#F58529", // Instagram orange
  "#8134AF", // Instagram purple
  "#4FC3E8", // Instagram cyan
  "#FFD4B5", // Peach pastel
  "#55A868", // Accent green
] as const;

export const INK = "#141420";
export const INK_SOFT = "#3C3C4A";
export const MUTED = "#7A7A88";
export const GRID = "rgba(17,17,27,0.06)";
export const AXIS_LINE = "rgba(17,17,27,0.12)";
export const CARD_BORDER = "#FFFFFF";
export const TOOLTIP_BG = "rgba(255,255,255,0.96)";
export const TOOLTIP_BORDER = "rgba(17,17,27,0.08)";

export const HEATMAP_RANGE = ["#FFF1E6", "#F58529", "#DD2A7B", "#8134AF"];

export const HEATMAP_RANGE_IG = ["#FDF4EC", "#FDD9B9", "#F58529", "#DD2A7B", "#8134AF"];

export const DIVERGING_PALETTE = ["#4FC3E8", "#BEE6F2", "#FAF5F1", "#F8BFD1", "#DD2A7B"];

type GradientStop = { offset: number; color: string };

export function gradientFill(from: string, to: string, direction: "horizontal" | "vertical" = "horizontal") {
  const [x, y, x2, y2] = direction === "horizontal" ? [0, 0, 1, 0] : [0, 0, 0, 1];
  return {
    type: "linear" as const,
    x,
    y,
    x2,
    y2,
    colorStops: [
      { offset: 0, color: from },
      { offset: 1, color: to },
    ] satisfies GradientStop[],
  };
}

export const IG_GRADIENT = gradientFill("#F58529", "#8134AF");
export const IG_GRADIENT_PINK = gradientFill("#F58529", "#DD2A7B");
