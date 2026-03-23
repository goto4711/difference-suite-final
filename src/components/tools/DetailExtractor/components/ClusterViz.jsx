import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ClusterViz = ({ data, onSelect, selectedId }) => {
    const svgRef = useRef();
    const wrapperRef = useRef();

    useEffect(() => {
        if (!data || data.length === 0) return;

        const width = wrapperRef.current.clientWidth;
        const height = wrapperRef.current.clientHeight;
        const margin = { top: 20, right: 20, bottom: 20, left: 20 };

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const xExtent = d3.extent(data, d => d.x);
        const yExtent = d3.extent(data, d => d.y);

        // Add padding to extent
        const xPad = (xExtent[1] - xExtent[0]) * 0.1;
        const yPad = (yExtent[1] - yExtent[0]) * 0.1;

        const xScale = d3.scaleLinear()
            .domain([xExtent[0] - xPad, xExtent[1] + xPad])
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - yPad, yExtent[1] + yPad])
            .range([innerHeight, 0]);

        // Draw points
        g.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", d => d.id === selectedId ? 8 : 5)
            .attr("fill", d => {
                // Color by cluster? Or just uniform?
                // Let's color "Norm" (low distance) vs "Outlier" (high distance)
                // Or just cluster colors.
                const colors = ["#832161", "#DA4167", "#ADFC92"];
                return colors[d.cluster % colors.length];
            })
            .attr("stroke", d => d.id === selectedId ? "#000" : "none")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .style("opacity", 0.8)
            .on("click", (event, d) => {
                onSelect(d);
            })
            .on("mouseover", function () {
                d3.select(this).attr("r", 8);
            })
            .on("mouseout", function (event, d) {
                if (d.id !== selectedId) {
                    d3.select(this).attr("r", 5);
                }
            });

        // Zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 5])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

    }, [data, selectedId, onSelect]);

    return (
        <div ref={wrapperRef} className="w-full h-full bg-white border-2 border-[var(--color-main)] shadow-[4px_4px_0px_rgba(0,0,0,0.1)] overflow-hidden relative">
            <svg ref={svgRef} className="w-full h-full"></svg>
            <div className="absolute bottom-2 right-2 bg-white/80 px-2 py-1 text-xs font-mono border border-[var(--color-main)] pointer-events-none">
                Scroll to Zoom • Click to Inspect
            </div>
        </div>
    );
};

export default ClusterViz;
