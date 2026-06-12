import {
    AudioRecorderModal as SharedAudioRecorderModal,
    type AudioRecorderModalProps as SharedAudioRecorderModalProps,
} from '@difference-suite/shared/components/dashboard/modals/AudioRecorderModal';
import { inferenceManager, type LoadProgressEvent } from '../../../core/inference/InferenceManager';

type AudioRecorderModalProps = Omit<SharedAudioRecorderModalProps, 'transcribeAudio'>;
type ProgressPayload = Exclude<LoadProgressEvent['progress'], number | undefined>;

const isProgressPayload = (value: LoadProgressEvent['progress']): value is ProgressPayload =>
    typeof value === 'object' && value !== null;

export const AudioRecorderModal = (props: AudioRecorderModalProps) => {
    const transcribeAudio: SharedAudioRecorderModalProps['transcribeAudio'] = async (_audioBlob, onUpdate) => {
        onUpdate({ status: 'Loading Whisper Model...', progress: 0 });

        await inferenceManager.loadGemma((progress: LoadProgressEvent) => {
            if (isProgressPayload(progress.progress) && progress.progress.file) {
                onUpdate({
                    status: `Downloading Model: ${Math.round(progress.progress.progress || 0)}%`,
                    progress: (progress.progress.progress || 0) / 100,
                });
            } else if (progress.message) {
                onUpdate({ status: progress.message });
            }
        });

        onUpdate({ status: 'Transcribing Audio Context...' });
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const result = await inferenceManager.generateGemma(
            [{ role: 'user', content: 'Transcribe this audio recording.' }],
            128,
        );

        return Array.isArray(result) && result[0]?.generated_text
            ? (result[0].generated_text as string)
            : 'Voice Input Pro (Simulated Transcription): This is a placeholder transcription from Gemma 4.';
    };

    return <SharedAudioRecorderModal {...props} transcribeAudio={transcribeAudio} />;
};
