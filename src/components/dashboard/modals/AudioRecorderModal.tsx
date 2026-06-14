import {
    AudioRecorderModal as SharedAudioRecorderModal,
    type AudioRecorderModalProps as SharedAudioRecorderModalProps,
} from '@difference-suite/shared/components/dashboard/modals/AudioRecorderModal';
import { useSuiteStore } from '@difference-suite/shared/stores/suiteStore';
import { transformersClient } from '../../../core/inference/TransformersClient';

type AudioRecorderModalProps = Omit<SharedAudioRecorderModalProps, 'transcribeAudio'>;

export const AudioRecorderModal = (props: AudioRecorderModalProps) => {
    const transcribeAudio: SharedAudioRecorderModalProps['transcribeAudio'] = async (audioBlob, onUpdate, language) => {
        const AudioContextCtor = window.AudioContext || (window as Window & typeof globalThis & {
            webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

        const audioContext = new AudioContextCtor({ sampleRate: 16000 });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const audioData = audioBuffer.getChannelData(0);

        onUpdate({ status: 'Loading Whisper Model...', progress: 0 });

        const result = await transformersClient.run({
            id: crypto.randomUUID(),
            tool: 'AudioRecorder',
            model: useSuiteStore.getState().asrModel,
            task: 'automatic-speech-recognition',
            // Omit language from payload when 'auto' so Whisper detects from the audio.
            payload: language === 'auto'
                ? { audio: audioData }
                : { audio: audioData, language }
        }, (progress) => {
            if (progress.stage === 'downloading') {
                onUpdate({
                    status: `Downloading Model: ${((progress.progress || 0) * 100).toFixed(0)}%`,
                    progress: progress.progress
                });
            } else if (progress.stage === 'running') {
                onUpdate({
                    status: 'Transcribing...',
                    progress: progress.progress
                });
            }
        });

        return result.output as string;
    };

    return <SharedAudioRecorderModal {...props} transcribeAudio={transcribeAudio} />;
};
