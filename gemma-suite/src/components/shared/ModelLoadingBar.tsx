import React, { useState, useEffect } from 'react';
import type { LoadProgressEvent } from '../../core/inference/InferenceManager';

interface ModelLoadingBarProps {
    progressEvent: LoadProgressEvent | null;
}

export const ModelLoadingBar: React.FC<ModelLoadingBarProps> = ({ progressEvent }) => {
    const [downloads, setDownloads] = useState<Record<string, { loaded: number, total: number, progress: number }>>({});
    const [overallProgress, setOverallProgress] = useState(0);

    useEffect(() => {
        if (!progressEvent) return;

        if (progressEvent.message) {
            // General status message (e.g. 'Initializing...')
            // We could display it, but maybe just stick to the bar
        }

        if (progressEvent.progress && typeof progressEvent.progress === 'object') {
            const data = progressEvent.progress;
            
            if (data.status === 'initiate' || data.status === 'download' || data.status === 'done') {
                setDownloads(prev => {
                    const newDownloads = { ...prev };
                    if (data.file) {
                        newDownloads[data.file] = {
                            loaded: data.loaded || 0,
                            total: data.total || 0,
                            progress: data.progress || (data.status === 'done' ? 100 : 0)
                        };
                    }
                    return newDownloads;
                });
            }
        }
    }, [progressEvent]);

    useEffect(() => {
        const files = Object.values(downloads);
        if (files.length === 0) return;

        let totalLoaded = 0;
        let totalSize = 0;
        
        // Use byte counts if accurate
        files.forEach(f => {
            totalLoaded += f.loaded;
            totalSize += f.total;
        });

        if (totalSize > 0) {
            setOverallProgress(Math.min((totalLoaded / totalSize) * 100, 100));
        } else {
            // Fallback to average percentage if total sizes aren't populated properly
            const avg = files.reduce((acc, f) => acc + f.progress, 0) / files.length;
            setOverallProgress(avg);
        }
    }, [downloads]);

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
