const ComparisonTable = ({ results, onSelectMatch, selectedMatch }) => {
    if (!results || results.length === 0) return null;

    const maxMatches = Math.max(...results.map(r => r.matches.length));

    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full border-2 border-main bg-white table-fixed">
                <thead>
                    <tr className="border-b-2 border-main">
                        <th className="p-4 text-left text-main uppercase font-bold text-sm w-24">Rank</th>
                        {results.map((context, i) => (
                            <th
                                key={i}
                                className="p-4 text-left uppercase font-bold text-sm"
                                style={{ color: context.color, width: `${100 / results.length}%` }}
                            >
                                {context.contextName}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: maxMatches }).map((_, rank) => (
                        <tr key={rank} className="border-b border-main/20">
                            <td className="p-4 font-mono font-bold text-main">#{rank + 1}</td>
                            {results.map((context, contextIndex) => {
                                const match = context.matches[rank];
                                const isSelected = selectedMatch && selectedMatch.text === match?.text;

                                return (
                                    <td
                                        key={contextIndex}
                                        className={`p-4 cursor-pointer transition-colors hover:bg-main/5 ${isSelected ? 'bg-main/10 ring-2 ring-inset ring-main' : ''}`}
                                        onClick={() => match && onSelectMatch(match, context.queryVector, context.color)}
                                    >
                                        {match ? (
                                            <div className="truncate">
                                                <div className="text-sm mb-1 font-medium truncate" title={match.text}>{match.text}</div>
                                                <div className="text-xs font-mono opacity-70">
                                                    {(match.similarity * 100).toFixed(1)}% similar
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="opacity-30">—</span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="text-xs text-center mt-2 opacity-50 uppercase tracking-widest">Click any cell to inspect vectors</p>
        </div>
    );
};

export default ComparisonTable;
