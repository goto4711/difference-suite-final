import type { DataItem, DataType } from "@difference-suite/shared/types";
import type { CSSProperties, ReactNode } from "react";

import type { MemorySimulationResult } from "./simulation";

export type DeepTimeView = 0 | 1 | 2;

export interface TextInitialData {
  id: string;
  content: string;
  type: "text";
}

export interface ImageInitialData {
  id: string;
  content: string;
  type: "image";
  name: string;
}

export interface MemoryInitialData {
  id: string;
  content: string;
  type: "memory";
}

export type InitialSuiteData = TextInitialData | ImageInitialData | MemoryInitialData | null;

export interface DeepTimeRouteState {
  initialData: InitialSuiteData;
  view: DeepTimeView;
}

export interface AttentionLensProps {
  modeToggle: ReactNode;
  initialSuiteData: TextInitialData | null;
}

export interface DiffusionScrubberProps {
  modeToggle: ReactNode;
  initialSuiteData: ImageInitialData | null;
}

export interface MemoryAuditProps {
  modeToggle: ReactNode;
  initialSuiteData: MemoryInitialData | null;
}

export interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  small?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
}

export interface SuiteSourceSelectorProps {
  typeFilter: DataType | DataType[];
  onLoad: (item: DataItem) => void | Promise<void>;
  label?: string;
}

export interface MemoryAnalysisResult {
  rnn: MemorySimulationResult;
  lstm: MemorySimulationResult;
  labels: string[];
  T: number;
  H: number;
}

export interface DiffusionStrip {
  t: number;
  dataUrl: string;
}
