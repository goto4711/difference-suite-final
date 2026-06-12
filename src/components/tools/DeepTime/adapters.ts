import type { AnalysisResult, DataItem } from "@difference-suite/shared/types";

import { CANVAS_SIZE } from "./data";
import type { DeepTimeRouteState } from "./types";

type DeepTimeModuleKey = "attention" | "diffusion" | "memory";
type NoiseGenerator = (size: number, seed: number) => Float32Array;

interface JsonRecord {
  [key: string]: unknown;
}

export interface LoadedImageAsset {
  imageData: ImageData;
  noise: Float32Array;
  name: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function get2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to acquire 2D canvas context.");
  }

  return context;
}

function buildImageAsset(
  image: HTMLImageElement,
  generateNoiseFn: NoiseGenerator,
  seed: number,
  name: string,
): LoadedImageAsset {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const sourceSize = Math.min(image.width, image.height);
  const context = get2DContext(canvas);

  context.drawImage(
    image,
    (image.width - sourceSize) / 2,
    (image.height - sourceSize) / 2,
    sourceSize,
    sourceSize,
    0,
    0,
    CANVAS_SIZE,
    CANVAS_SIZE,
  );

  return {
    imageData: context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE),
    noise: generateNoiseFn(CANVAS_SIZE, seed),
    name,
  };
}

function hashStringSeed(value: string): number {
  let seed = 0;

  for (let index = 0; index < value.length; index += 1) {
    seed = ((seed << 5) - seed + value.charCodeAt(index)) >>> 0;
  }

  return seed;
}

export function getStringContent(item: DataItem): string | null {
  return typeof item.content === "string" ? item.content : null;
}

export function loadImageFromUrl(url: string, generateNoiseFn: NoiseGenerator, name = "Suite image"): Promise<LoadedImageAsset> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        resolve(buildImageAsset(image, generateNoiseFn, hashStringSeed(url), name));
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Failed to prepare image data."));
      }
    };
    image.onerror = () => reject(new Error("Failed to load image from URL."));
    image.src = url;
  });
}

export async function loadImageFile(file: File, generateNoiseFn: NoiseGenerator): Promise<LoadedImageAsset> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Unsupported file type.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    return await loadImageFromUrl(objectUrl, generateNoiseFn, file.name).then((asset) => ({
      ...asset,
      noise: generateNoiseFn(CANVAS_SIZE, (file.size ^ file.lastModified) >>> 0),
    }));
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function timeseriesJsonToLabels(jsonString: string): string | null {
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    const events = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed)
        ? (parsed.events ?? parsed.data ?? parsed.items)
        : null;

    if (!Array.isArray(events) || events.length === 0) {
      return null;
    }

    const sample = events[0];

    if (!isRecord(sample)) {
      return null;
    }

    const keys = Object.keys(sample);
    const dateKey = keys.find((key) => /^(year|date|time|timestamp|period|when)$/i.test(key)) ?? null;
    const labelKey = keys.find((key) => /^(label|event|name|description|title|what|note)$/i.test(key)) ?? null;

    if (!dateKey && !labelKey) {
      return null;
    }

    const lines = events
      .map((event): string | null => {
        if (!isRecord(event)) {
          return null;
        }

        const dateValue = dateKey ? event[dateKey] : "";
        const labelValue = labelKey ? event[labelKey] : "";

        if (dateKey && labelKey) {
          return `${String(dateValue ?? "")} — ${String(labelValue ?? "")}`;
        }

        const fallback = dateValue ?? labelValue;
        return fallback == null ? null : String(fallback);
      })
      .filter((line): line is string => Boolean(line));

    return lines.length > 0 ? lines.join("\n") : null;
  } catch {
    return null;
  }
}

export function makeResultPayload(moduleKey: DeepTimeModuleKey, data: Record<string, unknown>): AnalysisResult {
  const summaries: Record<DeepTimeModuleKey, string> = {
    attention: "Attention weight matrix analysis",
    diffusion: "Diffusion noise process frame",
    memory: "RNN vs LSTM memory retention analysis",
  };

  return {
    toolId: `deep-time-${moduleKey}`,
    timestamp: Date.now(),
    summary: summaries[moduleKey],
    data,
  };
}

export function resolveDeepTimeRouteState(
  search: string,
  dataset: DataItem[],
  activeItem: string | null,
): DeepTimeRouteState {
  const params = new URLSearchParams(search);

  if (params.get("from") !== "suite" || !activeItem || dataset.length === 0) {
    return { initialData: null, view: 0 };
  }

  const item = dataset.find((candidate) => candidate.id === activeItem);

  if (!item) {
    return { initialData: null, view: 0 };
  }

  const content = getStringContent(item);

  if (content === null) {
    return { initialData: null, view: 0 };
  }

  if (item.type === "text") {
    return {
      initialData: { id: item.id, content, type: "text" },
      view: 0,
    };
  }

  if (item.type === "image") {
    return {
      initialData: { id: item.id, content, type: "image", name: item.name },
      view: 1,
    };
  }

  if (item.type === "timeseries") {
    const labels = timeseriesJsonToLabels(content);

    if (labels) {
      return {
        initialData: { id: item.id, content: labels, type: "memory" },
        view: 2,
      };
    }
  }

  return { initialData: null, view: 0 };
}
