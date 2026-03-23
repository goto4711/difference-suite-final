import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ThresholdHistogram = ({ data, threshold, setThreshold }) => {
    const svgRef = useRef();
    const wrapperRef = useRef();
    // Keep track of the X scale and dimensions across effects
    const scaleRef = useRef(null);

    // Effect 1: Initialize Chart & Data (Runs on Data Change)
    useEffect(() => {
        if (!data || data.length === 0 || !wrapperRef.current) return;

        const width = wrapperRef.current.clientWidth;
        if (!width) return;
        const height = 200;
        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Clear previous SVG
        d3.select(svgRef.current).selectAll("*").remove();

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`)
            .attr("class", "chart-group"); // ID for selection

        // X scale (Fixed [0, 1])
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, innerWidth]);

        scaleRef.current = x; // Update ref

        // Histogram bins
        const histogram = d3.bin()
            .value(d => d.risk_score)
            .domain(x.domain())
            .thresholds(x.ticks(40));

        const bins = histogram(data);

        // Y scale
        const y = d3.scaleLinear()
            .range([innerHeight, 0])
            .domain([0, d3.max(bins, d => d.length)]);

        // Append bars (Grouped for easier selection)
        svg.append("g")
            .attr("class", "bars-group")
            .selectAll("rect.bar")
            .data(bins)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", 1)
            .attr("transform", d => `translate(${x(d.x0)},${y(d.length)})`)
            .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr("height", d => innerHeight - y(d.length))
            .style("opacity", 0.9);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).ticks(10));

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(y).ticks(5));

        // Zone of Doubt Highlight (Placeholder)
        svg.append("rect")
            .attr("class", "doubt-rect")
            .attr("y", 0)
            .attr("height", innerHeight)
            .attr("fill", "var(--color-main-secondary)")
            .attr("opacity", 0.3)
            .style("pointer-events", "none");

        // Draggable Threshold Line Group
        const lineGroup = svg.append("g")
            .attr("class", "threshold-group")
            .style("cursor", "ew-resize");

        // The visible line
        lineGroup.append("line")
            .attr("y1", -10)
            .attr("y2", innerHeight)
            .attr("stroke", "#000")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");

        // The handle circle
        lineGroup.append("circle")
            .attr("cy", -10)
            .attr("r", 6)
            .attr("fill", "#000");

        // Invisible wide rect for hit testing
        lineGroup.append("rect")
            .attr("x", -10)
            .attr("y", -20)
            .attr("width", 20)
            .attr("height", innerHeight + 20)
            .attr("fill", "transparent");

        // Drag Behavior
        const drag = d3.drag()
            .container(svg.node()) // Relative to the Chart Group
            .on("drag", (event) => {
                let newThreshold = x.invert(event.x);
                newThreshold = Math.max(0, Math.min(1, newThreshold));
                setThreshold(newThreshold);
            });

        lineGroup.call(drag);

        // Click to set behavior on the SVG overlay
        // We create a transparent rect over the whole chart area to catch clicks
        svg.append("rect")
            .attr("width", innerWidth)
            .attr("height", innerHeight)
            .attr("fill", "transparent")
            .lower() // Put it behind everything
            .on("click", (event) => {
                const [coords] = d3.pointer(event);
                let newThreshold = x.invert(coords[0]);
                newThreshold = Math.max(0, Math.min(1, newThreshold));
                setThreshold(newThreshold);
            });


    }, [data, setThreshold]); // Run only when data or setter changes

    // Effect 2: Update Visuals (Runs on Threshold Change)
    useEffect(() => {
        if (!data || !scaleRef.current) return;

        const x = scaleRef.current;
        const svg = d3.select(svgRef.current).select(".chart-group");

        // Update Bar Colors
        svg.selectAll(".bar")
            .transition() // Smooth transition
            .duration(50)
            .style("fill", d => {
                const binMid = (d.x0 + d.x1) / 2;
                if (binMid < threshold) return "#832161"; // Deep Purple
                if (binMid >= threshold) return "#ADFC92"; // Neon Green
                return "#ccc";
            });

        // Update Threshold Line Position
        svg.select(".threshold-group")
            .attr("transform", `translate(${x(threshold)}, 0)`);

        // Update Doubt Zone
        const doubtRange = 0.05;
        svg.select(".doubt-rect")
            .attr("x", x(Math.max(0, threshold - doubtRange)))
            .attr("width", x(Math.min(1, threshold + doubtRange)) - x(Math.max(0, threshold - doubtRange)));

    }, [threshold, data]);

    return (
        <div ref={wrapperRef} className="w-full bg-white/50 rounded-none border-2 border-[var(--color-main)] p-4 select-none">
            <h3 className="text-lg font-bold mb-2 uppercase text-[var(--color-main)]">Risk Score Distribution</h3>
            <svg ref={svgRef}></svg>
            <p className="text-xs text-[var(--color-text)] mt-2 text-center opacity-70">
                Drag the dotted line to adjust the acceptance threshold.
            </p>
        </div>
    );
};

export default ThresholdHistogram;
