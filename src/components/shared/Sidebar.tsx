import { Link, useLocation } from 'react-router-dom';
import { TOOLS } from '../../utils/navigation';
import { LayoutDashboard } from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();

    return (
        <div className="w-[270px] bg-white border-r border-[#0000000d] flex flex-col h-full z-10 shrink-0 shadow-sm overflow-hidden">
            {/* Logo Area */}
            <div className="p-6 border-b border-[#0000000d] flex justify-center">
                <a href="https://deep-culture.org/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                    <img
                        src="https://deep-culture.org/wp-content/themes/deepculture/img/deep-culture-logo.png"
                        alt="Deep Culture"
                        className="h-20 w-auto"
                    />
                </a>
            </div>

            {/* Main Menu Group */}
            <div className="flex-1 overflow-y-auto py-8 custom-scrollbar">
                <div className="nav-group-label pl-8 bg-white">Main Menu</div>

                <Link
                    to="/"
                    className={`flex items-center gap-4 px-8 py-3 text-sm font-medium transition-all
                        ${location.pathname === '/'
                            ? 'text-main bg-main/10 border-r-4 border-main font-bold'
                            : 'text-main/60 hover:bg-main/5 hover:text-main border-r-4 border-transparent'
                        }`}
                >
                    <LayoutDashboard className="w-5 h-5" />
                    Data Dashboard
                </Link>

                <div className="nav-group-label mt-4 pl-8 bg-white">Tools</div>

                {TOOLS.map((tool) => {
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
            </div>
        </div>
    );
};

export default Sidebar;
