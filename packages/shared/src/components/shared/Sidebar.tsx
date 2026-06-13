import type { ComponentType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

export interface SidebarTool {
    path: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
}

interface SidebarAccessLink {
    href: string;
    label: string;
    badgeText?: string;
    /** Open the link in a new browser tab. Default false (same tab). */
    openInNewTab?: boolean;
}

interface SidebarProps {
    tools: SidebarTool[];
    logoSrc: string;
    logoHref?: string;
    accessLink?: SidebarAccessLink;
    /** Optional extra entries rendered under the "Main Menu" section, below Data Dashboard. */
    mainMenuExtras?: SidebarTool[];
    /**
     * Route the Data Dashboard link points to. Defaults to "/" for apps where
     * the dashboard is the root. difference-suite mounts it at /data-dashboard
     * so the root can redirect into the main menu cleanly.
     */
    dashboardPath?: string;
    /**
     * Suppress the Data Dashboard link entirely. Set true for apps where the
     * dashboard is parked and the main menu starts directly with mainMenuExtras.
     */
    hideDashboardLink?: boolean;
}

export const Sidebar = ({
    tools,
    logoSrc,
    logoHref = 'https://deep-culture.org/',
    accessLink,
    mainMenuExtras,
    dashboardPath = '/',
    hideDashboardLink = false,
}: SidebarProps) => {
    const location = useLocation();
    const isDashboardActive =
        location.pathname === dashboardPath ||
        (dashboardPath !== '/' && location.pathname === '/');

    return (
        <div className="w-[270px] bg-white border-r border-[#0000000d] flex flex-col h-full z-10 shrink-0 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#0000000d] flex justify-center">
                <a href={logoHref} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                    <img
                        src={logoSrc}
                        alt="Deep Culture"
                        className="h-20 w-auto"
                    />
                </a>
            </div>

            <div className="flex-1 overflow-y-auto py-8 custom-scrollbar">
                <div className="nav-group-label pl-8 bg-white">Main Menu</div>

                {!hideDashboardLink && (
                    <Link
                        to={dashboardPath}
                        className={`flex items-center gap-4 px-8 py-3 text-sm font-medium transition-all
                            ${isDashboardActive
                                ? 'text-main bg-main/10 border-r-4 border-main font-bold'
                                : 'text-main/60 hover:bg-main/5 hover:text-main border-r-4 border-transparent'
                            }`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Data Dashboard
                    </Link>
                )}

                {mainMenuExtras?.map((entry) => {
                    const isActive = location.pathname === entry.path;
                    return (
                        <Link
                            key={entry.path}
                            to={entry.path}
                            className={`flex items-center gap-4 px-8 py-3 text-sm font-medium transition-all
                                ${isActive
                                    ? 'text-main bg-main/10 border-r-4 border-main font-bold'
                                    : 'text-main/60 hover:bg-main/5 hover:text-main border-r-4 border-transparent'
                                }`}
                        >
                            <entry.icon className="w-5 h-5" />
                            {entry.label}
                        </Link>
                    );
                })}

                <div className="nav-group-label mt-4 pl-8 bg-white">Tools</div>

                {tools.map((tool) => {
                    const isActive = location.pathname === tool.path;
                    return (
                        <Link
                            key={tool.path}
                            to={tool.path}
                            className={`flex items-center gap-4 px-8 py-3 text-sm font-medium transition-all
                                ${isActive
                                    ? 'text-main bg-main/10 border-r-4 border-main font-bold'
                                    : 'text-[#666] hover:bg-main/5 hover:text-main border-r-4 border-transparent'
                                }`}
                        >
                            <tool.icon className="w-5 h-5" />
                            {tool.label}
                        </Link>
                    );
                })}

                {accessLink && (
                    <>
                        <div className="nav-group-label mt-8 pl-8 bg-white">Access</div>

                        <a
                            href={accessLink.href}
                            target={accessLink.openInNewTab ? '_blank' : undefined}
                            rel={accessLink.openInNewTab ? 'noopener noreferrer' : undefined}
                            className="flex items-center gap-4 px-8 py-3 text-sm font-medium text-main/40 hover:bg-main/5 hover:text-main border-r-4 border-transparent transition-all"
                        >
                            <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-[10px] font-bold">
                                {accessLink.badgeText ?? 'G'}
                            </div>
                            {accessLink.label}
                        </a>
                    </>
                )}
            </div>
        </div>
    );
};
