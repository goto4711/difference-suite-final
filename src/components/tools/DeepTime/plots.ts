import Plotly from "plotly.js-dist-min";

import { COLORS, HEATMAP_COLORSCALE, LSTM_COLOR, RNN_COLOR } from "./data";
import type { MemoryAnalysisResult } from "./types";

type PlotTarget = HTMLElement;

type PlotlyClient = {
  react: (
    target: PlotTarget,
    data: unknown[],
    layout: Record<string, unknown>,
    config: Record<string, unknown>,
  ) => Promise<void>;
  downloadImage: (target: PlotTarget, options: Record<string, unknown>) => void;
  toImage: (target: PlotTarget, options: Record<string, unknown>) => Promise<string>;
};

export const plotlyClient = Plotly as unknown as PlotlyClient;

export function renderAttentionHeatmap(target: HTMLDivElement, matrix: number[][], tokens: string[]): void {
  const size = tokens.length;
  const tickValues = Array.from({ length: size }, (_, index) => index);
  const labels = tokens.map((token) => (token.length > 11 ? `${token.slice(0, 10)}…` : token));
  const annotations =
    size <= 14
      ? tokens.flatMap((_, rowIndex) =>
          Array.from({ length: rowIndex + 1 }, (_, columnIndex) => {
            const value = matrix[rowIndex][columnIndex];

            return {
              x: columnIndex,
              y: rowIndex,
              text: value.toFixed(2),
              showarrow: false,
              xref: "x",
              yref: "y",
              font: {
                size: 9,
                family: COLORS.mono,
                color: value > 0.45 ? "#FBF7EF" : "#1A160D",
              },
            };
          }),
        )
      : [];

  void plotlyClient.react(
    target,
    [
      {
        z: matrix,
        x: tickValues,
        y: tickValues,
        type: "heatmap",
        colorscale: HEATMAP_COLORSCALE,
        zmin: 0,
        zmax: 1,
        showscale: true,
        colorbar: {
          thickness: 12,
          len: 0.85,
          tickfont: { size: 9, family: COLORS.mono },
          title: { text: "weight", font: { size: 10, family: COLORS.mono }, side: "right" },
        },
      },
    ],
    {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: COLORS.surface,
      margin: { t: 16, r: 72, b: 110, l: 104 },
      xaxis: {
        title: { text: "Key position (past tokens)", font: { size: 11, family: COLORS.sans }, standoff: 12 },
        tickmode: "array",
        tickvals: tickValues,
        ticktext: labels,
        tickangle: -42,
        tickfont: { size: 9, family: COLORS.mono },
        showgrid: false,
        linecolor: COLORS.border,
      },
      yaxis: {
        title: { text: "Query position (present token)", font: { size: 11, family: COLORS.sans }, standoff: 12 },
        tickmode: "array",
        tickvals: tickValues,
        ticktext: labels,
        tickfont: { size: 9, family: COLORS.mono },
        showgrid: false,
        autorange: "reversed",
        linecolor: COLORS.border,
      },
      annotations,
      font: { family: COLORS.sans, color: COLORS.ink2 },
    },
    { responsive: true, displayModeBar: false },
  );
}

function buildMemoryBaseLayout(labels: string[], totalSteps: number): Record<string, unknown> {
  const stepInterval = Math.max(1, Math.floor(totalSteps / 10));

  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: COLORS.surface,
    margin: { t: 12, r: 16, b: 80, l: 52 },
    font: { family: COLORS.sans, color: COLORS.ink2, size: 10 },
    legend: { font: { size: 10, family: COLORS.sans }, bgcolor: "rgba(0,0,0,0)" },
    xaxis: {
      tickangle: -45,
      tickfont: { size: 8, family: COLORS.mono },
      gridcolor: COLORS.borderLight,
      linecolor: COLORS.border,
      tickmode: "array",
      tickvals: Array.from({ length: totalSteps }, (_, index) => index).filter((_, index) => index % stepInterval === 0),
      ticktext: labels.filter((_, index) => index % stepInterval === 0),
      title: { text: "Historical timestep", font: { size: 10 }, standoff: 8 },
    },
  };
}

function buildYAxis(title: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: { text: title, font: { size: 10 }, standoff: 6 },
    gridcolor: COLORS.borderLight,
    linecolor: COLORS.border,
    tickfont: { size: 8, family: COLORS.mono },
    ...extra,
  };
}

function buildAnnotations(text: string): Array<Record<string, unknown>> {
  return [
    {
      x: 0.02,
      y: 0.97,
      xref: "paper",
      yref: "paper",
      showarrow: false,
      text,
      font: { size: 10, family: COLORS.mono, color: COLORS.ink3 },
      align: "left",
    },
  ];
}

function buildTrace(values: ArrayLike<number>, name: string, color: string): Record<string, unknown> {
  return {
    x: Array.from({ length: values.length }, (_, index) => index),
    y: Array.from(values),
    type: "scatter",
    mode: "lines",
    name,
    line: { color, width: 2 },
  };
}

export function renderMemoryPlots(
  targets: {
    linearTarget: HTMLDivElement | null;
    logTarget: HTMLDivElement | null;
    cosineTarget: HTMLDivElement | null;
  },
  result: MemoryAnalysisResult,
  showCosinePanel: boolean,
): void {
  const { linearTarget, logTarget, cosineTarget } = targets;
  const { rnn, lstm, labels, T } = result;
  const baseLayout = buildMemoryBaseLayout(labels, T);
  const finalStepMarker = {
    type: "line",
    x0: T - 1,
    x1: T - 1,
    y0: 0,
    y1: 1,
    yref: "paper",
    line: { color: COLORS.ink3, width: 1, dash: "dot" },
  };
  const config = { responsive: true, displayModeBar: false };

  if (linearTarget) {
    void plotlyClient.react(
      linearTarget,
      [
        buildTrace(rnn.gradMags, "Vanilla RNN", RNN_COLOR),
        buildTrace(lstm.gradMags, "LSTM", LSTM_COLOR),
      ],
      {
        ...baseLayout,
        shapes: [finalStepMarker],
        yaxis: buildYAxis("gradient magnitude"),
        annotations: buildAnnotations("A — linear scale"),
      },
      config,
    );
  }

  if (logTarget) {
    const epsilon = 1e-18;
    void plotlyClient.react(
      logTarget,
      [
        buildTrace(Array.from(rnn.gradMags).map((value) => Math.max(value, epsilon)), "Vanilla RNN", RNN_COLOR),
        buildTrace(Array.from(lstm.gradMags).map((value) => Math.max(value, epsilon)), "LSTM", LSTM_COLOR),
      ],
      {
        ...baseLayout,
        shapes: [finalStepMarker],
        yaxis: buildYAxis("gradient magnitude (log)", { type: "log" }),
        annotations: buildAnnotations("B — log scale: both models vanish"),
      },
      config,
    );
  }

  if (cosineTarget && showCosinePanel) {
    void plotlyClient.react(
      cosineTarget,
      [
        {
          ...buildTrace(rnn.simVals, "Vanilla RNN", RNN_COLOR),
          fill: "tozeroy",
          fillcolor: `${RNN_COLOR}14`,
        },
        {
          ...buildTrace(lstm.simVals, "LSTM", LSTM_COLOR),
          fill: "tozeroy",
          fillcolor: `${LSTM_COLOR}14`,
        },
      ],
      {
        ...baseLayout,
        shapes: [
          finalStepMarker,
          {
            type: "line",
            x0: 0,
            x1: T - 1,
            y0: 0,
            y1: 0,
            yref: "y",
            line: { color: COLORS.ink, width: 0.8, dash: "dot" },
          },
        ],
        yaxis: buildYAxis("cosine sim. to h(T)", { range: [-1.05, 1.05] }),
        annotations: buildAnnotations("C — hidden state similarity to present"),
        margin: { ...(baseLayout.margin as Record<string, unknown>), b: 90 },
      },
      config,
    );
  }
}
