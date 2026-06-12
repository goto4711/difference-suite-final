import { useMemo, useState } from "react";

import { useSuiteStore } from "@difference-suite/shared/stores/suiteStore";
import { Clock, Eye, Image as ImageIcon } from "lucide-react";
import { useLocation } from "react-router-dom";

import { resolveDeepTimeRouteState } from "./adapters";
import { AttentionLens } from "./AttentionLens";
import { DiffusionScrubber } from "./DiffusionScrubber";
import { MemoryAudit } from "./MemoryAudit";
import type { DeepTimeView } from "./types";

export default function DeepTime() {
  const [manualView, setManualView] = useState<DeepTimeView | null>(null);
  const { dataset, activeItem } = useSuiteStore();
  const location = useLocation();
  const routeState = useMemo(
    () => resolveDeepTimeRouteState(location.search, dataset, activeItem),
    [location.search, activeItem, dataset],
  );
  const initialData = routeState.initialData;
  const view = manualView ?? routeState.view;

  const modeToggle = (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
      <span className="text-xs font-bold text-gray-500 uppercase">Module:</span>
      <div className="flex rounded-lg overflow-hidden border border-gray-300">
        <button
          onClick={() => setManualView(0)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            view === 0 ? "bg-[var(--color-main)] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Eye size={16} />
          Attention Lens
        </button>
        <button
          onClick={() => setManualView(1)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            view === 1 ? "bg-[var(--color-main)] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <ImageIcon size={16} />
          Diffusion Scrubber
        </button>
        <button
          onClick={() => setManualView(2)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            view === 2 ? "bg-[var(--color-main)] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Clock size={16} />
          Memory Audit
        </button>
      </div>
    </div>
  );

  return (
    <>
      {view === 0 && <AttentionLens modeToggle={modeToggle} initialSuiteData={initialData?.type === "text" ? initialData : null} />}
      {view === 1 && <DiffusionScrubber modeToggle={modeToggle} initialSuiteData={initialData?.type === "image" ? initialData : null} />}
      {view === 2 && <MemoryAudit modeToggle={modeToggle} initialSuiteData={initialData?.type === "memory" ? initialData : null} />}
    </>
  );
}
