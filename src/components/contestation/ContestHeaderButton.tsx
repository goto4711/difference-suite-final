import { useLocation } from 'react-router-dom';
import { useCurrentOutputStore } from '../../stores/currentOutputStore';
import { TOOLS } from '../../utils/navigation';
import ContestButton from './ContestButton';

/**
 * Header-mounted Contest button. Renders only when the currently active tool
 * has published a primary output via `useReportCurrentOutput`. Sits next to
 * the ModelStatusWidget in the shared Header.
 */
const ContestHeaderButton = () => {
    const location = useLocation();
    const current = useCurrentOutputStore((s) => s.current);

    if (!current) return null;
    // Only show when the publication matches the active route, so a stale
    // record from a previously visited tool can't bleed onto another page.
    const activeTool = TOOLS.find((t) => t.path === location.pathname);
    if (!activeTool || activeTool.toolId !== current.toolId) return null;

    return (
        <ContestButton
            toolId={current.toolId}
            outputSummary={current.outputSummary}
            settings={current.settings}
            label="Contest"
        />
    );
};

export default ContestHeaderButton;
