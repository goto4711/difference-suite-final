import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';

interface WebcamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

export const WebcamModal: React.FC<WebcamModalProps> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Start camera when modal opens
    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const startCamera = async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error('Camera error:', err);
            setError('Could not access camera. Please allow permissions.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (context) {
            // Set canvas dim to video dim
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Flip horizontally to match mirror effect if needed, but let's keep it raw for now
            // context.translate(canvas.width, 0);
            // context.scale(-1, 1);

            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to file
            canvas.toBlob((blob) => {
                if (blob) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const file = new File([blob], `capture-${timestamp}.jpg`, { type: 'image/jpeg' });
                    onCapture(file);
                    onClose();
                }
            }, 'image/jpeg', 0.9);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white max-w-2xl w-full rounded-lg shadow-2xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b-2 border-main bg-main/5">
                    <h2 className="text-lg font-bold text-main uppercase flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        Capture Image
                    </h2>
                    <button onClick={onClose} className="text-main/60 hover:text-main">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 bg-black flex items-center justify-center relative aspect-video group">
                    {error ? (
                        <div className="text-white text-center p-8">
                            <p className="mb-4 text-red-400 font-bold">{error}</p>
                            <button
                                onClick={startCamera}
                                className="px-4 py-2 bg-white text-main font-bold uppercase rounded hover:bg-gray-200"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-contain"
                            />
                            {/* Hidden canvas for capture */}
                            <canvas ref={canvasRef} className="hidden" />
                        </>
                    )}
                </div>

                {/* Footer / Controls */}
                <div className="p-4 bg-white border-t-2 border-main flex justify-center gap-4">
                    <button
                        onClick={handleCapture}
                        disabled={!!error || !stream}
                        className="flex items-center gap-2 px-6 py-3 bg-main text-white font-bold uppercase tracking-wider hover:bg-main/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-[2px_2px_0px_rgba(0,0,0,0.2)] transition-all"
                    >
                        <Camera className="w-5 h-5" />
                        Take Photo
                    </button>
                </div>
            </div>
        </div>
    );
};
