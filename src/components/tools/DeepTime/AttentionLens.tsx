import { useEffect, useMemo, useRef, useState } from "react";

import { useSuiteStore } from "@difference-suite/shared/stores/suiteStore";
import { Clock, Download, Save } from "lucide-react";

import ToolLayout from "../../shared/ToolLayout";
import { getStringContent, makeResultPayload } from "./adapters";
import { EXAMPLES, MAX_TOKENS } from "./data";
import { plotlyClient, renderAttentionHeatmap } from "./plots";
import { SuiteSourceSelector } from "./shared";
import { buildMatrix, tokenize } from "./simulation";
import type { AttentionLensProps } from "./types";

export function AttentionLens({ modeToggle, initialSuiteData }: AttentionLensProps) {
  const { updateItemResult } = useSuiteStore();
  const [text, setText] = useState<string>(EXAMPLES[0]);
  const [lambda, setLambda] = useState(0);
  const [loadedItemId, setLoadedItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const plotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialSuiteData) {
      setText(initialSuiteData.content);
      setLoadedItemId(initialSuiteData.id);
    }
  }, [initialSuiteData]);

  const tokens = useMemo(() => tokenize(text), [text]);
  const matrix = useMemo(() => buildMatrix(tokens.length, lambda), [tokens.length, lambda]);
  const selfWeight = tokens.length > 0 ? (matrix[tokens.length - 1][tokens.length - 1] * 100).toFixed(1) : "—";

  useEffect(() => {
    const target = plotRef.current;

    if (!target || tokens.length === 0) {
      return;
    }

    renderAttentionHeatmap(target, matrix, tokens);
  }, [matrix, tokens]);

  const exportPng = () => {
    const target = plotRef.current;

    if (!target) {
      return;
    }

    plotlyClient.downloadImage(target, {
      format: "png",
      filename: "deep-time-attention",
      width: 900,
      height: 560,
    });
  };

  const saveToSuite = async () => {
    const target = plotRef.current;

    if (!loadedItemId || !target || saving) {
      return;
    }

    setSaving(true);

    try {
      const dataUrl = await plotlyClient.toImage(target, { format: "png", width: 800, height: 500 });
      const payload = makeResultPayload("attention", {
        lambda,
        tokens: tokens.length,
        selfWeight,
        visualization: dataUrl,
      });
      updateItemResult(loadedItemId, "deep-time-attention", payload);
      alert("Analysis saved to Suite record.");
    } catch (error) {
      console.error(error);
      alert("Failed to save to Suite.");
    } finally {
      setSaving(false);
    }
  };

  const modeName =
    lambda === 0
      ? "Uniform causal prior — zero Q/K baseline"
      : `Recency-weighted prior — weight ∝ exp(−${lambda.toFixed(2)}·Δt)`;

  const mainContent = (
    <div className="h-full flex flex-col">
      {modeToggle}
      <div className="flex-1 flex flex-col p-6 min-h-0 bg-gray-50">
        <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden relative">
          <div className="px-4 py-2 border-b border-gray-200 bg-white flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Attention weight matrix</span>
            <div className="flex gap-2">
              <button
                onClick={exportPng}
                disabled={tokens.length === 0}
                className="text-[10px] font-bold text-main uppercase hover:opacity-80 disabled:opacity-50"
              >
                <Download size={14} className="inline mr-1" /> EXPORT PNG
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            {tokens.length === 0 ? (
              <div className="text-gray-400 text-sm italic">
                Type an English sentence to see its causal attention matrix...
              </div>
            ) : (
              <div ref={plotRef} className="w-full h-full" role="img" aria-label="Attention weight matrix heatmap" />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const sideContent = (
    <div className="flex flex-col gap-6 p-1">
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-2">
        <SuiteSourceSelector
          typeFilter="text"
          onLoad={(item) => {
            const content = getStringContent(item);

            if (content === null) {
              alert("Selected Suite record does not contain text content.");
              return;
            }

            setText(content);
            setLoadedItemId(item.id);
          }}
        />

        <label className="text-xs font-bold text-text-muted block mt-4 mb-2 uppercase tracking-tight">
          Input text
          {tokens.length >= MAX_TOKENS && (
            <span className="text-[10px] text-red-600 font-mono ml-2">capped at {MAX_TOKENS}</span>
          )}
        </label>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="w-full h-24 p-2 text-xs font-sans bg-white border border-gray-200 rounded text-gray-800 resize-y focus:outline-none focus:border-main"
          placeholder="Past events cast shadows..."
        />

        <div className="mt-2 flex gap-1 flex-wrap items-center">
          <span className="text-[10px] font-mono text-gray-500 mr-1">presets:</span>
          {EXAMPLES.map((example, index) => (
            <button
              key={example}
              onClick={() => setText(example)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                text === example
                  ? "bg-black text-white border-black"
                  : "bg-transparent text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              eg {index + 1}
            </button>
          ))}
          <button
            onClick={() => setText("")}
            className="px-2 py-0.5 text-[10px] font-mono rounded border border-gray-200 bg-transparent text-gray-500 hover:border-gray-400"
          >
            clear
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-bold block mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-main" />
          Attention Parameters
        </label>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
          <div className="flex justify-between mb-1">
            <label className="text-[10px] font-bold text-text-muted uppercase">Memory decay rate (λ)</label>
            <span className="text-[10px] font-bold text-main">{lambda.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={lambda}
            onChange={(event) => setLambda(Number.parseFloat(event.target.value))}
            className="dc-slider"
          />
          <p className="text-[9px] text-text-muted mt-1 opacity-70">
            {lambda === 0
              ? "0.0 — uniform causal baseline."
              : lambda === 2
                ? "2.0 — strong fading memory."
                : "Adjusts recency bias."}
          </p>
        </div>

        <div className="bg-white p-3 rounded-lg border border-gray-100">
          <label className="text-[10px] font-bold text-text-muted uppercase block border-b border-gray-100 pb-1 mb-2">
            Attention Prior Shape
          </label>
          <div className="text-xs font-mono text-gray-700 min-h-[2.5em]">{modeName}</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-main"></div>
          <span className="text-sm font-bold">Analysis Output</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="bg-white p-2 rounded border border-gray-100">
            <span className="block text-[10px] text-text-muted uppercase">Tokens</span>
            <span className="font-bold">{tokens.length}</span>
          </div>
          <div className="bg-white p-2 rounded border border-gray-100">
            <span className="block text-[10px] text-text-muted uppercase" title="How much the final token attends to itself">
              Self-Weight (last)
            </span>
            <span className="font-bold">
              {selfWeight}
              {selfWeight !== "—" ? "%" : ""}
            </span>
          </div>
        </div>

        {loadedItemId && (
          <button
            onClick={saveToSuite}
            disabled={saving || tokens.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2 bg-main text-white text-xs font-bold uppercase rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save size={14} /> {saving ? "SAVING..." : "SAVE BACK TO SUITE"}
          </button>
        )}
      </div>

      <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 text-[10px] text-amber-800 leading-relaxed font-sans italic">
        <strong>Epistemic Note:</strong> This is a synthetic attention matrix simulating Transformer mechanics.
        Standard models (λ=0) treat all prior tokens equally; applying a decay scalar recovers human-like temporal
        degradation.
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Attention Lens"
      subtitle="Exposing how transformer architecture intrinsically flattens temporal sequence into geometric space."
      mainContent={mainContent}
      sideContent={sideContent}
    />
  );
}
