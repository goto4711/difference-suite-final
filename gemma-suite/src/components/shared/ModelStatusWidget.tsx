import { useCallback } from 'react';
import { ModelStatusWidget as SharedModelStatusWidget } from '@difference-suite/shared/components/shared/ModelStatusWidget';
import { inferenceManager } from '../../core/inference/InferenceManager';

export const ModelStatusWidget = () => {
    const fetchStatus = useCallback(async () => inferenceManager.getStatus(), []);
    return <SharedModelStatusWidget fetchStatus={fetchStatus} />;
};
