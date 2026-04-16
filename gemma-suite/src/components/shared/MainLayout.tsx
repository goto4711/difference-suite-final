import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import StatsRow from './StatsRow';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <div className="flex h-screen bg-bg overflow-hidden relative">
            {/* Sidebar (Left) - Fixed Width */}
            <Sidebar />

            {/* Main Content Area (Right) - Grow to fill */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">

                {/* Header - Sticky Top */}
                <Header />

                {/* Main Scrollable Workspace */}
                <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">

                    {/* Top Stats - Always Visible on Scroll Top */}
                    <div className="shrink-0 bg-bg">
                        <StatsRow />
                    </div>

                    {/* Content Container - Where Tools/Dashboard Live */}
                    <div className="flex-1 p-8 pt-6 w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
