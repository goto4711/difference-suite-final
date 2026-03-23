import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceDot,
    ReferenceArea
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white border-2 border-[var(--color-main)] p-2 shadow-lg">
                <p className="font-bold text-[var(--color-main)]">{label}</p>
                <p>Actual: {data.value.toFixed(2)}</p>
                {data.predictedValue !== null && (
                    <p className="text-gray-500 text-sm">Predicted: {data.predictedValue.toFixed(2)}</p>
                )}
                {data.isAnomaly && (
                    <p className="text-red-500 font-bold mt-1">⚠️ ANOMALY DETECTED</p>
                )}
            </div>
        );
    }
    return null;
};

const TimelineViz = ({ data, onSelectAnomaly, selectedId }) => {
    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-400">
                No data to visualize
            </div>
        );
    }

    return (
        <div className="h-[400px] w-full bg-white border-2 border-[var(--color-main)] p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                    onClick={(e) => {
                        if (e && e.activePayload) {
                            onSelectAnomaly(e.activePayload[0].payload);
                        }
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                        dataKey="timestamp"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(str) => str.substring(5)} // Show MM-DD
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Predicted Trend Line (Ghost) */}
                    <Line
                        type="monotone"
                        dataKey="predictedValue"
                        stroke="#9ca3af"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={false}
                        name="Predicted"
                    />

                    {/* Normal Trend Line with Clickable Dots */}
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-main)"
                        strokeWidth={2}
                        dot={(props) => {
                            const { cx, cy, payload } = props;
                            if (payload.isAnomaly) {
                                return (
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={6}
                                        fill="red"
                                        stroke="white"
                                        strokeWidth={2}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => onSelectAnomaly(payload)}
                                    />
                                );
                            }
                            return null;
                        }}
                        activeDot={{ r: 8, onClick: (e, payload) => onSelectAnomaly(payload.payload) }}
                        name="Actual"
                    />

                    {/* Highlight Selected */}
                    {selectedId !== null && (
                        <ReferenceDot
                            x={data.find(d => d.id === selectedId)?.timestamp}
                            y={data.find(d => d.id === selectedId)?.value}
                            r={10}
                            fill="transparent"
                            stroke="var(--color-alt)"
                            strokeWidth={4}
                        />
                    )}

                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TimelineViz;
