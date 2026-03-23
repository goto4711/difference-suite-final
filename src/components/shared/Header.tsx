import { useState } from 'react';
import { Search, Bell, LogIn, LogOut } from 'lucide-react';
import { useSuiteStore } from '../../stores/suiteStore';
import { LoginModal } from '../auth/LoginModal';
import { ModelStatusWidget } from './ModelStatusWidget';

const Header = () => {
    const { isAuthenticated, userEmail, logout } = useSuiteStore();
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    return (
        <div className="h-[90px] bg-white border-b border-[rgba(0,0,0,0.05)] px-8 flex items-center justify-between z-20 sticky top-0">
            {/* Logo Area - Moved to Sidebar */}
            <div className="flex items-center gap-4">
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-6">
                <ModelStatusWidget />
                <button className="btn-icon">
                    <Search className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                    {isAuthenticated ? (
                        <>
                            <div className="text-right hidden md:block">
                                <div className="text-sm font-bold text-text">{userEmail}</div>
                                <div className="text-xs text-text-muted">Researcher</div>
                            </div>
                            <img
                                src={`https://ui-avatars.com/api/?name=${userEmail}&background=832161&color=fff`}
                                alt="User"
                                className="w-10 h-10 rounded-full"
                            />
                            <button
                                onClick={logout}
                                className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Log Out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsLoginOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-gray-800 transition-all"
                        >
                            <LogIn className="w-4 h-4" />
                            Log In
                        </button>
                    )}
                </div>
            </div>

            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </div>
    );
};

export default Header;
