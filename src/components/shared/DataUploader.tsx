import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useSuiteStore } from '../../stores/suiteStore';
import type { DataItem } from '../../types';

const DataUploader = () => {
    const { addItems, isProcessing } = useSuiteStore();

    const processFiles = useCallback(async (files: FileList | null) => {
        if (!files) return;

        const newItems: DataItem[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const isImage = file.type.startsWith('image/');
            const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json');

            if (!isImage && !isText) continue;

            const item: DataItem = {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: isImage ? 'image' : 'text',
                content: isImage ? URL.createObjectURL(file) : await file.text(),
                rawFile: file,
                metadata: {
                    size: file.size,
                    lastModified: file.lastModified,
                    mimeType: file.type
                }
            };

            newItems.push(item);
        }

        addItems(newItems);
    }, [addItems]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        processFiles(e.dataTransfer.files);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(e.target.files);
    };

    return (
        <div
            className="border-2 border-dashed border-[var(--color-main)] bg-[var(--color-background)]/20 rounded-lg p-8 text-center cursor-pointer hover:bg-[var(--color-background)]/40 transition-colors group relative"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
        >
            <input
                type="file"
                id="file-input"
                multiple
                className="hidden"
                onChange={handleFileInput}
                accept="image/*,.txt,.md,.json,.csv"
            />

            <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--color-main)] group-hover:scale-110 transition-transform" />
            <p className="text-lg font-bold text-[var(--color-main)]">
                Drag & Drop files or Click to Upload
            </p>
            <p className="text-sm text-[var(--color-text)] opacity-70 mt-2">
                Supports Images (JPG, PNG) and Text (TXT, MD, JSON)
            </p>
        </div>
    );
};

export default DataUploader;
