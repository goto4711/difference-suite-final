import React, { useMemo } from 'react';
import type { LoadProgressEvent } from '../../core/inference/InferenceManager';

interface ModelLoadingBarProps {
    progressEvent: LoadProgressEvent | null;
}

type ProgressPayload = {
    loaded?: number;
    total?: number;
    progress?: number;
};

const isProgressPayload = (value: unknown): value is ProgressPayload =>
    typeof value === 'object' && value !== null;

export const ModelLoadingBar: React.FC<ModelLoadingBarProps> = ({ progressEvent }) => {
    const overallProgress = useMemo(() => {
        if (!progressEvent) {
            return 0;
        }

        if (typeof progressEvent.progress === 'number') {
            return progressEvent.progress <= 1
                ? progressEvent.progress * 100
                : progressEvent.progress;
        }

        if (isProgressPayload(progressEvent.progress)) {
            const { loaded = 0, total = 0, progress = 0 } = progressEvent.progress;

            if (total > 0) {
                return Math.min((loaded / total) * 100, 100);
            }

            return progress <= 1 ? progress * 100 : progress;
        }

        return 0;
    }, [progressEvent]);

    if (!progressEvent) return null;

    return (
        <div className="w-48 bg-white/20 border border-main/30 h-6 relative overflow-hidden flex items-center justify-center">
            <div 
                className="absolute top-0 left-0 h-full bg-main/20 transition-all duration-300 ease-out" 
                style={{ width: `${overallProgress}%` }}
            />
            <span className="relative z-10 text-[10px] font-mono text-main tracking-widest font-bold">
                {overallProgress > 0 ? `LOADING MODELS ${overallProgress.toFixed(0)}%` : 'INITIALIZING...'}
            </span>
        </div>
    );
};
