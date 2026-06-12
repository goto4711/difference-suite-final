import { useCallback, useEffect, useRef, useState } from "react";

import { useSuiteStore } from "@difference-suite/shared/stores/suiteStore";
import { Activity, Download, Image as ImageIcon, Save } from "lucide-react";

import ToolLayout from "../../shared/ToolLayout";
import { getStringContent, loadImageFile, loadImageFromUrl, makeResultPayload } from "./adapters";
import { CANVAS_SIZE } from "./data";
import { ALPHAS_CUMPROD, applyNoise, generateNoise, makeDemoImage } from "./simulation";
import { SuiteSourceSelector } from "./shared";
import type { DiffusionScrubberProps, DiffusionStrip } from "./types";

function get2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to acquire 2D canvas context.");
  }

  return context;
}

export function DiffusionScrubber({ modeToggle, initialSuiteData }: DiffusionScrubberProps) {
  const { updateItemResult } = useSuiteStore();
  const [timestep, setTimestep] = useState(0);
  const [srcPixels, setSrcPixels] = useState<ImageData | null>(null);
  const [noise, setNoise] = useState<Float32Array | null>(null);
  const [dragging, setDragging] = useState(false);
  const [strips, setStrips] = useState<DiffusionStrip[] | null>(null);
  const [loadedItemId, setLoadedItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!initialSuiteData) {
      return;
    }

    void loadImageFromUrl(initialSuiteData.content, generateNoise, initialSuiteData.name)
      .then(({ imageData, noise: generatedNoise }) => {
        setSrcPixels(imageData);
        setNoise(generatedNoise);
        setLoadedItemId(initialSuiteData.id);
        setTimestep(0);
      })
      .catch((error) => {
        console.error("Initial load failed", error);
      });
  }, [initialSuiteData]);

  useEffect(() => {
    const demoPixels = makeDemoImage(CANVAS_SIZE);
    setSrcPixels(new ImageData(new Uint8ClampedArray(demoPixels), CANVAS_SIZE, CANVAS_SIZE));
    setNoise(generateNoise(CANVAS_SIZE, 42));
  }, []);

  const loadFile = useCallback((file?: File | null) => {
    if (!file) {
      return;
    }

    setTimestep(0);
    void loadImageFile(file, generateNoise)
      .then(({ imageData, noise: generatedNoise }) => {
        setSrcPixels(imageData);
        setNoise(generatedNoise);
      })
      .catch((error) => {
        console.error("File load failed", error);
        alert(error instanceof Error ? error.message : "Failed to load image.");
      });
  }, []);

  useEffect(() => {
    if (!srcPixels || !noise) {
      return;
    }

    const steps = [0, 200, 400, 600, 800, 999] as const;

    setStrips(
      steps.map((step) => {
        const noisyPixels = applyNoise(srcPixels.data, noise, step);
        const fullCanvas = document.createElement("canvas");
        fullCanvas.width = CANVAS_SIZE;
        fullCanvas.height = CANVAS_SIZE;
        get2DContext(fullCanvas).putImageData(
          new ImageData(new Uint8ClampedArray(noisyPixels), CANVAS_SIZE, CANVAS_SIZE),
          0,
          0,
        );

        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = 72;
        thumbCanvas.height = 72;
        get2DContext(thumbCanvas).drawImage(fullCanvas, 0, 0, 72, 72);

        return {
          t: step,
          dataUrl: thumbCanvas.toDataURL("image/jpeg", 0.82),
        };
      }),
    );
  }, [srcPixels, noise]);

  useEffect(() => {
    const target = canvasRef.current;

    if (!target || !srcPixels || !noise) {
      return;
    }

    const noisyPixels = applyNoise(srcPixels.data, noise, timestep);
    get2DContext(target).putImageData(new ImageData(new Uint8ClampedArray(noisyPixels), CANVAS_SIZE, CANVAS_SIZE), 0, 0);
  }, [timestep, srcPixels, noise]);

  const alphaBar = ALPHAS_CUMPROD[timestep];
  const signalPercent = (alphaBar * 100).toFixed(1);
  const noisePercent = ((1 - alphaBar) * 100).toFixed(1);

  const exportFrame = () => {
    const target = canvasRef.current;

    if (!target) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = target.toDataURL("image/png");
    anchor.download = `deep-time-diffusion-t${timestep}.png`;
    anchor.click();
  };

  const saveToSuite = async () => {
    const target = canvasRef.current;

    if (!loadedItemId || !target || saving) {
      return;
    }

    setSaving(true);

    try {
      const dataUrl = target.toDataURL("image/png");
      const payload = makeResultPayload("diffusion", {
        timestep,
        signalPercent,
        noisePercent,
        visualization: dataUrl,
      });
      updateItemResult(loadedItemId, "deep-time-diffusion", payload);
      alert("Analysis saved to Suite record.");
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
      <div className="flex-1 p-6 flex flex-col items-center justify-center bg-gray-50 overflow-hidden relative">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Target Process State (t={timestep})
            </span>
            <div className="flex gap-2">
              <button
                onClick={exportFrame}
                disabled={!srcPixels}
                className="text-[10px] font-bold text-main uppercase hover:opacity-80 disabled:opacity-50"
              >
                <Download size={14} className="inline mr-1" /> EXPORT PNG
              </button>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gray-100 rounded" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block w-full h-full"
              aria-label={`Artifact at diffusion timestep ${timestep}`}
            />
          </div>
        </div>

        {strips && (
          <div className="w-full max-w-[600px] mt-8 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <label className="text-xs font-bold uppercase tracking-wide text-text-muted mb-3 block">Evolution history</label>
            <div className="flex gap-2">
              {strips.map(({ t, dataUrl }) => (
                <div
                  key={t}
                  role="button"
                  tabIndex={0}
                  aria-label={`Jump to timestep ${t}`}
                  aria-pressed={timestep === t}
                  onClick={() => setTimestep(t)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setTimestep(t);
                    }
                  }}
                  className={`cursor-pointer flex-1 border-2 rounded overflow-hidden transition-colors ${
                    timestep === t ? "border-[var(--color-main)]" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img src={dataUrl} className="block w-full" alt={`t=${t}`} />
                  <div className="text-center text-[9px] font-mono text-gray-500 bg-gray-50 py-0.5">t={t}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const sideContent = (
    <div className="flex flex-col gap-6 p-1">
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-2">
        <label className="text-xs font-bold text-text-muted block mb-2 uppercase tracking-tight">
          Load Historical Artifact
        </label>
        <SuiteSourceSelector
          typeFilter="image"
          onLoad={async (item) => {
            const content = getStringContent(item);

            if (content === null) {
              alert("Selected Suite record does not contain image content.");
              return;
            }

            try {
              const { imageData, noise: generatedNoise } = await loadImageFromUrl(content, generateNoise, item.name);
              setSrcPixels(imageData);
              setNoise(generatedNoise);
              setLoadedItemId(item.id);
              setTimestep(0);
            } catch (error) {
              alert(`Failed to load image from Suite: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
          }}
        />

        <div
          role="button"
          tabIndex={0}
          aria-label="Upload image — click or drag and drop"
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            loadFile(event.dataTransfer.files.item(0));
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              fileRef.current?.click();
            }
          }}
          className={`mt-4 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
            dragging ? "bg-amber-50 border-amber-600" : "bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-gray-400"
          }`}
        >
          <ImageIcon size={20} className="text-gray-400" />
          <div className="text-xs font-sans text-gray-600">Drop image or click</div>
          <div className="text-[10px] font-mono text-gray-400">JPEG · PNG · WebP</div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            aria-hidden="true"
            className="hidden"
            onChange={(event) => loadFile(event.target.files?.item(0))}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-bold block mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-main" />
          Forward Process parameters
        </label>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold text-text-muted uppercase">Timestep (t)</label>
            <span className="text-sm font-bold font-mono text-main">
              {timestep} <span className="text-[10px] text-gray-400">/ 999</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={999}
            step={1}
            value={timestep}
            onChange={(event) => setTimestep(Number.parseInt(event.target.value, 10))}
            className="dc-slider"
          />
          <div className="flex justify-between text-[9px] font-mono text-gray-500 mt-1">
            <span>0=artifact</span>
            <span>999=noise</span>
          </div>

          <div className="flex items-center gap-1 mt-4">
            <span className="text-[9px] font-bold text-gray-500 uppercase whitespace-nowrap mr-1">T-JUMP:</span>
            {[0, 100, 500, 999].map((jumpTarget) => (
              <button
                key={jumpTarget}
                onClick={() => setTimestep(jumpTarget)}
                className={`flex-1 py-1 text-[10px] font-mono rounded border transition-colors ${
                  timestep === jumpTarget
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {jumpTarget}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 pt-4 border-t border-gray-100">
        <label className="text-[10px] font-bold text-text-muted uppercase block mb-2">Signal / Noise Ratio</label>
        <div className="h-4 rounded overflow-hidden flex border border-gray-300 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-150"
            style={{ width: `${signalPercent}%` }}
            title={`Signal: ${signalPercent}%`}
          />
          <div
            className="h-full bg-[var(--color-main)] transition-all duration-150"
            style={{ flex: 1 }}
            title={`Noise: ${noisePercent}%`}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono mt-1">
          <span className="text-blue-600">ᾱ: {alphaBar.toFixed(4)}</span>
          <span className="text-[var(--color-main)]">1-ᾱ: {(1 - alphaBar).toFixed(4)}</span>
        </div>

        {loadedItemId && srcPixels && (
          <button
            onClick={saveToSuite}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2 mt-6 bg-main text-white text-xs font-bold uppercase rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save size={14} /> {saving ? "SAVING..." : "SAVE BACK TO SUITE"}
          </button>
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-[10px] text-blue-800 leading-relaxed font-sans italic">
        <strong>Epistemic Note:</strong> Noise is applied in raw RGB space to avoid a 250MB latent VAE dependency, but
        the mathematical cosine schedule <em>q(x_t | x₀)</em> holds identical meaning. We are watching structure yield
        to algorithmic equilibrium.
      </div>
    </div>
  );

  return (
    <ToolLayout
      title="Diffusion Scrubber"
      subtitle="Examine the irreversible march of data entropy through the forward diffusion process."
      mainContent={mainContent}
      sideContent={sideContent}
    />
  );
}
