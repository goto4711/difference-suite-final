import { useCallback } from 'react';
import { ModelStatusWidget as SharedModelStatusWidget } from '@difference-suite/shared/components/shared/ModelStatusWidget';
import { transformersClient } from '../../core/inference/TransformersClient';

export const ModelStatusWidget = () => {
    const fetchStatus = useCallback(() => transformersClient.getStatus(), []);
    return <SharedModelStatusWidget fetchStatus={fetchStatus} />;
};
