import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { TOOLS } from '../../utils/navigation';
import { MachineWorkDrawer } from '../machineRoom/MachineWorkDrawer';

interface ToolLayoutProps {
    title: string;
    subtitle?: string;
    status?: string | React.ReactNode;
    mainContent: React.ReactNode;
    sideContent: React.ReactNode;
}

const useCurrentToolId = (): string | undefined => {
    const location = useLocation();
    return useMemo(() => {
        const match = TOOLS.find((t) => t.path === location.pathname);
        return match?.toolId;
    }, [location.pathname]);
};

const ToolLayout: React.FC<ToolLayoutProps> = ({
    title,
    subtitle,
    status,
    mainContent,
    sideContent
}) => {
    const toolId = useCurrentToolId();

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
                {/* Big Box (Main Canvas) - 8 Cols */}
                <div className="lg:col-span-8 flex flex-col">
                    <div className="dc-card h-full flex flex-col">
                        <div className="dc-card-header bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-lg font-bold text-main">{title}</h2>
                                {subtitle && <p className="text-sm text-text-muted font-normal mt-0.5">{subtitle}</p>}
                            </div>
                            {/* Interactive Mode Toggles can go here */}
                        </div>
                        <div className="dc-card-body flex-1 overflow-hidden relative bg-white">
                            {mainContent}
                        </div>
                    </div>
                </div>

                {/* Small Box (Side Controls) - 4 Cols */}
                <div className="lg:col-span-4 flex flex-col">
                    <div className="dc-card h-full flex flex-col">
                        <div className="dc-card-header bg-white">
                            <span className="text-sm uppercase font-bold text-text-muted tracking-wide">Controls & Status</span>
                            {status && (
                                <div className="text-xs font-semibold px-2 py-1 rounded bg-gray-100">
                                    {status}
                                </div>
                            )}
                        </div>
                        <div className="dc-card-body flex-1 overflow-y-auto bg-white custom-scrollbar">
                            {sideContent}
                        </div>
                    </div>
                </div>
            </div>
            {toolId && <MachineWorkDrawer toolId={toolId} />}
        </div>
    );
};

export default ToolLayout;
