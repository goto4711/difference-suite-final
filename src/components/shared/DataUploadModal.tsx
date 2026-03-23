import { useRef, useState } from 'react';
import { X, Upload, FileText, Image, CheckCircle2 } from 'lucide-react';
import DataUploader from './DataUploader';

interface DataUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DataUploadModal = ({ isOpen, onClose }: DataUploadModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h3 className="text-xl font-bold text-main">Upload Data</h3>
                        <p className="text-sm text-text-muted">Add images or text documents to your active dataset.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-text-muted"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <DataUploader />
                </div>

                <div className="p-6 bg-gray-50 rounded-b-xl border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataUploadModal;
