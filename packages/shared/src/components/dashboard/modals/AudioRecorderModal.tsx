import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, X, Save, FileText } from 'lucide-react';

export interface AudioTranscriptionUpdate {
    status: string;
    progress?: number;
}

export interface AudioRecorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
    onTranscribeCapture?: (text: string) => void;
    transcribeAudio: (
        audioBlob: Blob,
        onUpdate: (update: AudioTranscriptionUpdate) => void,
    ) => Promise<string>;
}

export const AudioRecorderModal = ({
    isOpen,
    onClose,
    onCapture,
    onTranscribeCapture,
    transcribeAudio,
}: AudioRecorderModalProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionProgress, setTranscriptionProgress] = useState(0);
    const [transcriptionStatus, setTranscriptionStatus] = useState<string>('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const previewUrlRef = useRef<string | null>(null);

    const clearPreviewUrl = useCallback(() => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
    }, []);

    const clearRecording = useCallback(() => {
        clearPreviewUrl();
        setAudioBlob(null);
        setPreviewUrl(null);
        setDuration(0);
        setError(null);
        setIsTranscribing(false);
        setTranscriptionProgress(0);
        setTranscriptionStatus('');
    }, [clearPreviewUrl]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [isRecording]);

    useEffect(() => {
        return () => {
            stopRecording();
            clearPreviewUrl();
        };
    }, [clearPreviewUrl, stopRecording]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                clearPreviewUrl();
                const url = URL.createObjectURL(blob);
                previewUrlRef.current = url;
                setAudioBlob(blob);
                setPreviewUrl(url);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration((previous) => previous + 1);
            }, 1000);
        } catch (recordingError) {
            console.error('Mic error:', recordingError);
            setError('Could not access microphone.');
        }
    };

    const handleSave = () => {
        if (audioBlob) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const file = new File([audioBlob], `recording-${timestamp}.webm`, { type: 'audio/webm' });
            onCapture(file);
            clearRecording();
            onClose();
        }
    };

    const handleTranscribeAndSave = async () => {
        if (!audioBlob) return;

        setIsTranscribing(true);
        setTranscriptionStatus('Preprocessing Audio...');
        setTranscriptionProgress(0);

        try {
            const text = await transcribeAudio(audioBlob, ({ status, progress }) => {
                setTranscriptionStatus(status);
                setTranscriptionProgress(progress ?? 0);
            });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const file = new File([text], `transcript-${timestamp}.txt`, { type: 'text/plain' });

            if (onTranscribeCapture) {
                onTranscribeCapture(text);
            } else {
                onCapture(file);
            }

            clearRecording();
            onClose();
        } catch (transcriptionError) {
            console.error('Transcription failed', transcriptionError);
            setError('Transcription failed. See console.');
            setIsTranscribing(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white max-w-md w-full rounded-lg shadow-2xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b-2 border-main bg-main/5">
                    <h2 className="text-lg font-bold text-main uppercase flex items-center gap-2">
                        <Mic className="w-5 h-5" />
                        Record Audio
                    </h2>
                    {!isTranscribing && (
                        <button onClick={onClose} className="text-main/60 hover:text-main">
                            <X className="w-6 h-6" />
                        </button>
                    )}
                </div>

                <div className="p-8 flex flex-col items-center justify-center gap-6 bg-gray-50 min-h-[300px]">
                    {isTranscribing ? (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-4 border-main/20 animate-spin border-t-main"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <FileText className="w-8 h-8 text-main animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-main uppercase">{transcriptionStatus}</h3>
                                {transcriptionProgress > 0 && transcriptionProgress < 1 && (
                                    <div className="w-48 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden mx-auto">
                                        <div
                                            className="h-full bg-main transition-all duration-300"
                                            style={{ width: `${transcriptionProgress * 100}%` }}
                                        ></div>
                                    </div>
                                )}
                                <p className="text-xs text-text-muted mt-2">Running local neural network...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${isRecording ? 'border-red-500 bg-red-50 animate-pulse' : 'border-main/20 bg-white'}`}>
                                <Mic className={`w-10 h-10 ${isRecording ? 'text-red-500' : 'text-main/40'}`} />
                            </div>

                            <div className="text-3xl font-mono font-bold text-main">
                                {formatTime(duration)}
                            </div>

                            {error && <p className="text-red-500 text-sm font-bold">{error}</p>}

                            {audioBlob && previewUrl && !isRecording && (
                                <div className="w-full bg-white p-3 rounded border border-main/20 text-center">
                                    <p className="text-xs font-bold text-main/60 uppercase mb-2">Review</p>
                                    <audio controls src={previewUrl} className="w-full h-8" />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {!isTranscribing && (
                    <div className="p-4 bg-white border-t-2 border-main flex flex-wrap justify-center gap-3">
                        {!isRecording && !audioBlob && (
                            <button
                                onClick={startRecording}
                                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-bold uppercase tracking-wider hover:bg-red-600 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-[2px_2px_0px_rgba(0,0,0,0.2)] transition-all"
                            >
                                <Mic className="w-5 h-5" />
                                Record
                            </button>
                        )}

                        {isRecording && (
                            <button
                                onClick={stopRecording}
                                className="flex items-center gap-2 px-6 py-3 bg-white text-main border-2 border-main font-bold uppercase tracking-wider hover:bg-gray-50 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-[2px_2px_0px_rgba(0,0,0,0.2)] transition-all"
                            >
                                <Square className="w-5 h-5 fill-current" />
                                Stop
                            </button>
                        )}

                        {audioBlob && !isRecording && (
                            <>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-4 py-3 bg-white text-main border border-main font-bold uppercase tracking-wider hover:bg-gray-50 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] active:translate-y-[1px] active:shadow-none transition-all text-xs"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Audio
                                </button>

                                <button
                                    onClick={handleTranscribeAndSave}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-main text-white font-bold uppercase tracking-wider hover:bg-main/90 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-[2px_2px_0px_rgba(0,0,0,0.2)] transition-all text-xs"
                                >
                                    <FileText className="w-4 h-4" />
                                    Transcribe & Save
                                </button>
                            </>
                        )}

                        {audioBlob && !isRecording && (
                            <button
                                onClick={clearRecording}
                                className="px-4 py-3 text-main/60 font-bold uppercase hover:text-main text-xs"
                            >
                                Discard
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
