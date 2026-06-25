import { useMemo } from 'react';
import { useSuiteStore } from '@difference-suite/shared/stores/suiteStore';
import type { DataType } from '@difference-suite/shared/types';

interface CollectionFilterProps {
    /** Selected collection id, or null for "all collections". */
    value: string | null;
    onChange: (collectionId: string | null) => void;
    /** Which item type to count per collection (default 'image'). */
    type?: DataType;
    className?: string;
    id?: string;
}

/**
 * A compact <select> that narrows a tool's item picker to one collection.
 * Renders nothing when there are no collections containing the given type,
 * so single-collection / loose-item setups are unaffected.
 */
export default function CollectionFilter({
    value,
    onChange,
    type = 'image',
    className = '',
    id,
}: CollectionFilterProps) {
    const dataset = useSuiteStore((s) => s.dataset);
    const collections = useSuiteStore((s) => s.collections);

    const options = useMemo(
        () =>
            collections
                .map((c) => ({
                    id: c.id,
                    name: c.name,
                    count: dataset.filter((it) => it.collectionId === c.id && it.type === type).length,
                }))
                .filter((o) => o.count > 0),
        [collections, dataset, type],
    );

    const total = useMemo(() => dataset.filter((it) => it.type === type).length, [dataset, type]);

    // Nothing worth filtering — keep the UI unchanged for simple setups.
    if (options.length === 0) return null;

    return (
        <select
            id={id}
            aria-label="Filter by collection"
            className={`w-full text-[11px] p-2 bg-gray-50 border-none rounded-lg ${className}`}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
        >
            <option value="">All collections ({total})</option>
            {options.map((o) => (
                <option key={o.id} value={o.id}>
                    {o.name} ({o.count})
                </option>
            ))}
        </select>
    );
}
