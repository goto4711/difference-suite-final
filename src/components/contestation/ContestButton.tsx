import { useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquareWarning, X } from 'lucide-react';
import {
    CONTESTATION_CATEGORIES,
    CONTESTATION_CATEGORY_LABEL,
    CONTESTATION_NOTE_MAX,
    useContestationStore,
    type ContestationCategory,
} from '../../stores/contestationStore';

interface ContestButtonProps {
    /** Same id the Machine Room uses (e.g. 'GlitchDetector'). */
    toolId: string;
    /** Plain-text description of the output being contested. */
    outputSummary: string;
    /** Optional tool-state snapshot (e.g. { threshold: 0.8 }). */
    settings?: Record<string, string | number>;
    /** Optional override label for the trigger button. */
    label?: string;
    /** Compact rendering (icon-only trigger). */
    compact?: boolean;
    /** Optional className for the trigger. */
    className?: string;
}

const INITIAL_CATEGORY: ContestationCategory = 'disagreement';

/**
 * Quiet "Contest this" button + dialog. Writes a ContestationRecord scoped
 * to the current route/tool. Reuses the suite's card/border palette; no new
 * design system. Native <dialog> handles focus trap and Escape-to-close.
 */
const ContestButton = ({
    toolId,
    outputSummary,
    settings,
    label = 'Contest this',
    compact = false,
    className = '',
}: ContestButtonProps) => {
    const location = useLocation();
    const add = useContestationStore((s) => s.add);
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const noteRef = useRef<HTMLTextAreaElement | null>(null);
    const formId = useId();

    const [category, setCategory] = useState<ContestationCategory>(INITIAL_CATEGORY);
    const [note, setNote] = useState('');
    const [author, setAuthor] = useState('');
    const [confirmed, setConfirmed] = useState(false);

    const open = () => {
        setConfirmed(false);
        const dlg = dialogRef.current;
        if (!dlg) return;
        if (typeof dlg.showModal === 'function') {
            dlg.showModal();
        } else {
            dlg.setAttribute('open', '');
        }
        // Focus the textarea after the dialog is shown so keyboard users can
        // start typing immediately.
        queueMicrotask(() => noteRef.current?.focus());
    };

    const close = () => {
        const dlg = dialogRef.current;
        if (!dlg) return;
        if (typeof dlg.close === 'function') {
            dlg.close();
        } else {
            dlg.removeAttribute('open');
        }
    };

    const reset = () => {
        setCategory(INITIAL_CATEGORY);
        setNote('');
        setAuthor('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = note.trim();
        if (!trimmed) return;
        add({
            toolId,
            route: location.pathname,
            outputSummary,
            category,
            note: trimmed,
            settings,
            author: author.trim() || undefined,
        });
        setConfirmed(true);
        reset();
    };

    useEffect(() => {
        // If the dialog is closed by Escape or backdrop, clear confirmation UI
        // so the next open starts clean.
        const dlg = dialogRef.current;
        if (!dlg) return;
        const handleClose = () => setConfirmed(false);
        dlg.addEventListener('close', handleClose);
        return () => dlg.removeEventListener('close', handleClose);
    }, []);

    return (
        <>
            <button
                type="button"
                onClick={open}
                className={
                    className ||
                    'inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-main border border-main/30 bg-white hover:bg-main/5 rounded transition-colors'
                }
                title="Record a contestation: tell the suite this output is wrong, unfair, or missing something."
                aria-haspopup="dialog"
            >
                <MessageSquareWarning className="w-3.5 h-3.5" aria-hidden />
                {!compact && <span>{label}</span>}
            </button>

            <dialog
                ref={dialogRef}
                aria-labelledby={`${formId}-title`}
                className="p-0 rounded-lg shadow-xl border border-gray-200 bg-white w-[min(560px,92vw)] backdrop:bg-black/40"
                onClick={(e) => {
                    // Click on the backdrop (the dialog element itself, not its
                    // children) closes the dialog.
                    if (e.target === dialogRef.current) close();
                }}
            >
                <form
                    method="dialog"
                    onSubmit={handleSubmit}
                    className="flex flex-col"
                >
                    <header className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
                        <div>
                            <h2
                                id={`${formId}-title`}
                                className="text-base font-bold text-main flex items-center gap-2"
                            >
                                <MessageSquareWarning className="w-4 h-4" aria-hidden />
                                Contest this output
                            </h2>
                            <p className="text-[11px] text-text-muted mt-0.5">
                                Recorded on this machine only. You can export your contestations later.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={close}
                            aria-label="Close"
                            className="shrink-0 text-text-muted hover:text-main rounded p-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </header>

                    {confirmed ? (
                        <div className="px-5 py-6 text-center" role="status" aria-live="polite">
                            <p className="text-sm text-main font-bold">Contestation recorded.</p>
                            <p className="text-xs text-text-muted mt-1">
                                It will appear in the Contestations ledger.
                            </p>
                            <div className="mt-4 flex justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmed(false)}
                                    className="px-3 py-1.5 text-xs font-bold text-main border border-main/30 hover:bg-main/5 rounded"
                                >
                                    Add another
                                </button>
                                <button
                                    type="button"
                                    onClick={close}
                                    className="px-3 py-1.5 text-xs font-bold text-white bg-main hover:bg-main-hover rounded"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="px-5 py-4 flex flex-col gap-4">
                            <div>
                                <span className="block text-[10px] uppercase font-bold tracking-wider text-text-muted mb-1">
                                    You are contesting
                                </span>
                                <div className="text-xs bg-gray-50 border border-gray-200 rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
                                    {outputSummary || <em className="text-text-muted">(no output description)</em>}
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor={`${formId}-category`}
                                    className="block text-[10px] uppercase font-bold tracking-wider text-text-muted mb-1"
                                >
                                    Category
                                </label>
                                <select
                                    id={`${formId}-category`}
                                    value={category}
                                    onChange={(e) =>
                                        setCategory(e.target.value as ContestationCategory)
                                    }
                                    className="deep-input w-full text-sm"
                                >
                                    {CONTESTATION_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>
                                            {CONTESTATION_CATEGORY_LABEL[c]}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor={`${formId}-note`}
                                    className="block text-[10px] uppercase font-bold tracking-wider text-text-muted mb-1"
                                >
                                    Your dissent <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    ref={noteRef}
                                    id={`${formId}-note`}
                                    value={note}
                                    onChange={(e) =>
                                        setNote(e.target.value.slice(0, CONTESTATION_NOTE_MAX))
                                    }
                                    required
                                    rows={4}
                                    maxLength={CONTESTATION_NOTE_MAX}
                                    placeholder="Why is this output wrong, unfair, or missing something?"
                                    className="deep-input w-full text-sm resize-y"
                                />
                                <div className="flex justify-end text-[10px] text-text-muted mt-0.5">
                                    {note.length}/{CONTESTATION_NOTE_MAX}
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor={`${formId}-author`}
                                    className="block text-[10px] uppercase font-bold tracking-wider text-text-muted mb-1"
                                >
                                    Initials or pseudonym (optional)
                                </label>
                                <input
                                    id={`${formId}-author`}
                                    type="text"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value.slice(0, 32))}
                                    placeholder="e.g. TB"
                                    autoComplete="off"
                                    className="deep-input w-full text-sm"
                                />
                                <p className="text-[10px] text-text-muted mt-0.5">
                                    No accounts, no email. Used only to label your packet.
                                </p>
                            </div>

                            <footer className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={close}
                                    className="px-3 py-1.5 text-xs font-bold text-text-muted hover:text-main rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!note.trim()}
                                    className="px-3 py-1.5 text-xs font-bold text-white bg-main hover:bg-main-hover rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Record contestation
                                </button>
                            </footer>
                        </div>
                    )}
                </form>
            </dialog>
        </>
    );
};

export default ContestButton;
