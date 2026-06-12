import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSuiteStore } from "@difference-suite/shared/stores/suiteStore";
import { Layers, Save } from "lucide-react";

import ToolLayout from "../../shared/ToolLayout";
import { getStringContent, makeResultPayload, timeseriesJsonToLabels } from "./adapters";
import { DEFAULT_EVENTS, HIDDEN_OPTIONS, LSTM_COLOR, MA_INPUT, MA_SEED, MA_SEQ_LEN, RNN_COLOR } from "./data";
import { plotlyClient, renderMemoryPlots } from "./plots";
import { SuiteSourceSelector } from "./shared";
import { runLSTM, runRNN } from "./simulation";
import type { MemoryAnalysisResult, MemoryAuditProps } from "./types";

function parseLabels(rawLabels: string): string[] {
  return rawLabels
    .split("\n")
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, MA_SEQ_LEN);
}

function formatEarlyGradient(values: Float32Array): string {
  const mean = Array.from(values.slice(0, 10)).reduce((sum, value) => sum + value, 0) / 10;
  return mean.toExponential(2);
}

export function MemoryAudit({ modeToggle, initialSuiteData }: MemoryAuditProps) {
  const { updateItemResult } = useSuiteStore();
  const [rawLabels, setRawLabels] = useState(DEFAULT_EVENTS.join("\n"));
  const [hiddenSize, setHiddenSize] = useState(32);
  const [showCos, setShowCos] = useState(true);
  const [result, setResult] = useState<MemoryAnalysisResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [loadedItemId, setLoadedItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const plotLinRef = useRef<HTMLDivElement | null>(null);
  const plotLogRef = useRef<HTMLDivElement | null>(null);
  const plotCosRef = useRef<HTMLDivElement | null>(null);
  const rawLabelsRef = useRef(rawLabels);
  const initialHiddenSizeRef = useRef(hiddenSize);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    rawLabelsRef.current = rawLabels;
  }, [rawLabels]);

  useEffect(() => {
    if (initialSuiteData) {
      setRawLabels(initialSuiteData.content);
      setLoadedItemId(initialSuiteData.id);
    }
  }, [initialSuiteData]);

  const runAnalysis = useCallback((hiddenDimension: number) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    setComputing(true);
    timerRef.current = window.setTimeout(() => {
      const labels = parseLabels(rawLabelsRef.current);
      const totalSteps = labels.length;

      setResult({
        rnn: runRNN(totalSteps, MA_INPUT, hiddenDimension, MA_SEED),
        lstm: runLSTM(totalSteps, MA_INPUT, hiddenDimension, MA_SEED),
        labels,
        T: totalSteps,
        H: hiddenDimension,
      });
      setComputing(false);
      timerRef.current = null;
    }, 10);
  }, []);

  useEffect(() => {
    runAnalysis(initialHiddenSizeRef.current);
  }, [runAnalysis]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!result) {
      return;
    }

    renderMemoryPlots(
      {
        linearTarget: plotLinRef.current,
        logTarget: plotLogRef.current,
        cosineTarget: plotCosRef.current,
      },
      result,
      showCos,
    );
  }, [result, showCos]);

  const labels = useMemo(() => parseLabels(rawLabels), [rawLabels]);
  const totalSteps = labels.length;
  const rnnMean = result ? formatEarlyGradient(result.rnn.gradMags) : "—";
  const lstmMean = result ? formatEarlyGradient(result.lstm.gradMags) : "—";

  const exportCharts = () => {
    const options = { format: "png", width: 700, height: 300 };

    if (plotLinRef.current) {
      plotlyClient.downloadImage(plotLinRef.current, { ...options, filename: "deep-time-gradient-linear" });
    }

    if (plotLogRef.current) {
      plotlyClient.downloadImage(plotLogRef.current, { ...options, filename: "deep-time-gradient-log" });
    }

    if (showCos && plotCosRef.current) {
      plotlyClient.downloadImage(plotCosRef.current, {
        ...options,
        width: 1000,
        filename: "deep-time-cosine-sim",
      });
    }
  };

  const saveToSuite = async () => {
    if (!loadedItemId || !result || saving) {
      return;
    }

    setSaving(true);

    try {
      const payload = makeResultPayload("memory", {
        hiddenSize: result.H,
        steps: result.T,
        rnnEarlyGradient: rnnMean,
        lstmEarlyGradient: lstmMean,
        timestamp: Date.now(),
      });
      updateItemResult(loadedItemId, "deep-time-memory", payload);
      alert("Analysis results saved to Suite record.");
    } catch (error) {
      console.error(error);
      alert("Failed to save to Suite.");
    } finally {
      setSaving(false);
    }
  };

  const mainContent = (
    <div className="h-full flex flex-col">
      {modeToggle}
      <div className="flex-1 p-6 bg-gray-50 flex flex-col gap-4 overflow-y-auto">
        {!result ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic border-2 border-dashed border-gray-200 rounded-lg bg-white">
            Press "run analysis" to compute vanishing gradients...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div ref={plotLinRef} className="w-full h-[220px]" role="img" aria-label="Gradient magnitude linear scale" />
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div ref={plotLogRef} className="w-full h-[220px]" role="img" aria-label="Gradient magnitude log scale" />
              </div>
            </div>
            {showCos && (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div ref={plotCosRef} className="w-full h-[240px]" role="img" aria-label="Hidden state cosine similarity" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const sideContent = (
    <div className="flex flex-col gap-6 p-1">
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-2">
        <label className="text-xs font-bold text-text-muted block mb-2 uppercase tracking-tight">Load Dataset</label>
        <SuiteSourceSelector
          typeFilter={["text", "timeseries"]}
          onLoad={(item) => {
            const content = getStringContent(item);

            if (content === null) {
              alert("Selected Suite record does not contain text content.");
              return;
            }

            if (item.type === "text") {
              setRawLabels(content);
              setLoadedItemId(item.id);
              return;
            }

            if (item.type === "timeseries") {
              const extractedLabels = timeseriesJsonToLabels(content);

              if (extractedLabels) {
                setRawLabels(extractedLabels);
                setLoadedItemId(item.id);
              } else {
                alert("Could not extract a recognizable event timeline from this JSON file.");
              }
            }
          }}
        />

        <div className="mt-4 flex justify-between items-end mb-2">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-tight block">Event timeline</label>
          <span className={`text-[10px] font-mono ${totalSteps >= MA_SEQ_LEN ? "text-red-500 font-bold" : "text-gray-400"}`}>
            {totalSteps} / {MA_SEQ_LEN}
          </span>
        </div>
        <textarea
          value={rawLabels}
          onChange={(event) => setRawLabels(event.target.value)}
          className="w-full h-40 p-2 text-xs font-mono bg-white border border-gray-200 rounded text-gray-800 resize-y focus:outline-none focus:border-main"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => setRawLabels(DEFAULT_EVENTS.join("\n"))}
            className="text-[10px] font-mono text-gray-500 hover:text-black hover:underline cursor-pointer"
          >
            reset default
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-bold block mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-main" />
          State Parameters
        </label>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
          <label className="text-[10px] font-bold text-text-muted uppercase block">Hidden Dimension Size</label>
          <div className="flex gap-2 mt-2">
            {HIDDEN_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => {
                  setHiddenSize(option);
                  runAnalysis(option);
                }}
                className={`flex-1 py-1 text-[10px] font-mono border rounded transition-colors ${
                  hiddenSize === option ? "bg-black border-black text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            onClick={() => runAnalysis(hiddenSize)}
            disabled={computing}
            className={`w-full mt-4 py-2 text-xs font-bold uppercase rounded tracking-wide transition-colors ${
              computing ? "bg-gray-200 text-gray-400 cursor-wait" : "bg-main text-white hover:opacity-90"
            }`}
          >
            {computing ? "computing..." : "run analysis"}
          </button>
        </div>
      </div>

      <div className="mt-2 pt-4 border-t border-gray-100">
        <label className="text-[10px] font-bold text-text-muted uppercase block mb-2">Run Analysis Stats</label>

        <div className="grid grid-cols-1 gap-2 text-xs mb-4">
          {result ? (
            <>
              <div className="bg-white p-2 rounded border border-gray-100 flex justify-between items-center">
                <span className="text-[10px] text-text-muted uppercase">RNN Early Grad</span>
                <span className="font-mono font-bold" style={{ color: RNN_COLOR }}>
                  {rnnMean}
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100 flex justify-between items-center">
                <span className="text-[10px] text-text-muted uppercase">LSTM Early Grad</span>
                <span className="font-mono font-bold" style={{ color: LSTM_COLOR }}>
                  {lstmMean}
                </span>
              </div>
            </>
          ) : (
            <div className="text-[10px] italic text-gray-400 py-1">No analysis run yet</div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCos((current) => !current)}
            className="flex-1 py-1 px-2 border border-blue-200 bg-blue-50 text-blue-700 text-[10px] rounded uppercase font-bold hover:bg-blue-100 transition-colors"
          >
            {showCos ? "Hide" : "Show"} Panel C
          </button>

          {result && (
            <button
              onClick={exportCharts}
              className="flex-1 py-1 px-2 border border-gray-200 bg-white text-gray-600 text-[10px] rounded uppercase font-bold hover:bg-gray-50 transition-colors"
            >
              Export Charts
            </button>
          )}
        </div>

        {loadedItemId && result && (
          <button
            onClick={saveToSuite}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2 mt-4 bg-main text-white text-xs font-bold uppercase rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save size={14} /> {saving ? "SAVING..." : "SAVE BACK TO SUITE"}
          </button>
        )}

        <div className="mt-4 p-2 bg-gray-50 rounded border border-gray-100 text-[9px] font-mono text-gray-500 text-center">
          seed: {MA_SEED} • dim: {MA_INPUT} • len: {totalSteps} • h: {hiddenSize}
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-[10px] text-blue-800 leading-relaxed font-sans italic">
        <strong>Epistemic Note:</strong> Both models use random initialisation — results characterise architectural
        structure, not trained behaviour. LSTM slows the vanishing gradient; it does not eliminate it. Computed locally
        via pure-JS backpropagation.
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Memory Audit"
      subtitle="Examine vanishing gradients and structural forgetting in recurrent architectures."
      mainContent={mainContent}
      sideContent={sideContent}
    />
  );
}
