import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSuiteStore } from '../../stores/suiteStore';
import { checkDomain } from '../../config/authConfig';
import { GraduationCap, ArrowRight, AlertCircle, University, X } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const { login } = useSuiteStore();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsChecking(true);

        setTimeout(() => {
            if (checkDomain(email)) {
                login(email);
                onClose();
            } else {
                setError('Access Restricted: Please sign in with a valid university email address.');
                setIsChecking(false);
            }
        }, 600);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-main/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white border-2 border-main shadow-[8px_8px_0px_rgba(131,33,97,0.2)] rounded-lg max-w-md w-full relative overflow-hidden flex flex-col items-center p-8 animate-in zoom-in-95 duration-200">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-main/40 hover:text-main transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-main/5 border-2 border-main mb-6">
                    <GraduationCap className="w-8 h-8 text-main" />
                </div>

                <h2 className="text-2xl font-bold text-main uppercase tracking-tight mb-2">Academic Access</h2>
                <p className="text-center text-main/70 mb-8 text-sm font-medium">
                    Please log in with your institutional email to unlock the Difference Suite.
                </p>

                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <University className="h-5 w-5 text-main/40" />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="researcher@university.edu"
                            className="w-full pl-11 pr-4 py-3 border-2 border-main bg-white text-main placeholder-main/30 focus:outline-none focus:shadow-[4px_4px_0px_rgba(131,33,97,0.1)] transition-all font-bold"
                            required
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border-2 border-red-500 text-red-600 text-xs font-bold uppercase animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isChecking}
                        className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-main text-white border-2 border-main font-bold uppercase tracking-wider hover:bg-main/90 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-[2px_2px_0px_rgba(0,0,0,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isChecking ? 'Verifying...' : 'Unlock Tools'}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    );
};
