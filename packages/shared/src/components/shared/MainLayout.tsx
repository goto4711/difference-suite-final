import type { ComponentType, ReactNode } from 'react';
import StatsRow from './StatsRow';

interface MainLayoutProps {
    children: ReactNode;
    HeaderComponent: ComponentType;
    SidebarComponent: ComponentType;
}

const MainLayout = ({ children, HeaderComponent, SidebarComponent }: MainLayoutProps) => {
    return (
        <div className="flex h-screen bg-bg overflow-hidden relative">
            <SidebarComponent />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
                <HeaderComponent />

                <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
                    <div className="shrink-0 bg-bg">
                        <StatsRow />
                    </div>

                    <div className="flex-1 p-8 pt-6 w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
