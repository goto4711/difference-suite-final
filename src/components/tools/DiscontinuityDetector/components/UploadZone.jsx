import React from 'react';
import { Upload } from 'lucide-react';

const UploadZone = ({ onFileUpload }) => {
    return (
        <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-main)] to-[var(--color-alt)] rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white border-2 border-dashed border-[var(--color-main)] p-8 rounded-lg flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors">
                <Upload size={48} className="text-[var(--color-main)] mb-4" />
                <h3 className="text-lg font-bold uppercase text-[var(--color-main)]">Upload Time-Series Data</h3>
                <p className="text-sm opacity-60 mb-4">CSV or JSON format</p>
                <p className="text-xs font-mono bg-gray-100 p-2 rounded">
                    Required columns: timestamp, value
                </p>
                <input
                    type="file"
                    accept=".csv,.json"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={onFileUpload}
                />
            </div>
        </div>
    );
};

export default UploadZone;
