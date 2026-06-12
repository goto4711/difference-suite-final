import React from 'react';
import { useSuiteStore } from '../../stores/suiteStore';
import { Lock } from 'lucide-react';
import { SKIP_AUTH } from '../../config/authConfig';

interface AuthGuardProps {
    children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { isAuthenticated } = useSuiteStore();
    const hasAccess = isAuthenticated || SKIP_AUTH;

    if (!hasAccess) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-white/50">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Lock className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-900">Restricted Access</h3>
                        <p className="text-gray-500 mt-1 max-w-xs">
                            Please log in via the top-right button to access these tools.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
