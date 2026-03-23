import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const RadialViz = ({ queryText, results }) => {
    const svgRef = useRef();
    const wrapperRef = useRef();

    useEffect(() => {
        if (!results || results.length === 0 || !queryText) return;

        const width = wrapperRef.current.clientWidth;
        const height = wrapperRef.current.clientHeight || 600;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        svg.attr("width", width).attr("height", height);

        // Prepare nodes and links
        const nodes = [{ id: "query", type: "query", r: 15, x: centerX, y: centerY }];
        const links = [];

        results.forEach((context, i) => {
            const angle = (i * 2 * Math.PI) / results.length - Math.PI / 2;
            const contextX = centerX + radius * Math.cos(angle);
            const contextY = centerY + radius * Math.sin(angle);

            // Context Anchor Node (invisible but used for gravity)
            nodes.push({
                id: `context-${i}`,
                type: "context",
                r: 0,
                fx: contextX,
                fy: contextY,
                color: context.color,
                name: context.contextName
            });

            // Match Nodes
            context.matches.forEach((match, j) => {
                nodes.push({
                    id: `match-${i}-${j}`,
                    type: "match",
                    text: match.text,
                    similarity: match.similarity,
                    color: context.color,
                    r: 5 + match.similarity * 10,
                    contextIndex: i
                });
            });
        });

        // Simulation
        const simulation = d3.forceSimulation(nodes)
            .force("charge", d3.forceManyBody().strength(-50))
            .force("collide", d3.forceCollide().radius(d => d.r + 2))
            .force("radial", d3.forceRadial(
                d => d.type === 'match' ? radius * 0.7 : 0,
                centerX,
                centerY
            ).strength(0.1))
            .force("center", d3.forceCenter(centerX, centerY));

        // Custom force to pull matches towards their context sector
        simulation.force("sector", alpha => {
            nodes.forEach(d => {
                if (d.type === 'match') {
                    const angle = (d.contextIndex * 2 * Math.PI) / results.length - Math.PI / 2;
                    const targetX = centerX + radius * 0.7 * Math.cos(angle);
                    const targetY = centerY + radius * 0.7 * Math.sin(angle);
                    d.vx += (targetX - d.x) * alpha * 0.5;
                    d.vy += (targetY - d.y) * alpha * 0.5;
                }
            });
        });

        // Draw elements
        const link = svg.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6);

        // Context Labels
        const labels = svg.append("g")
            .selectAll("text")
            .data(nodes.filter(d => d.type === 'context'))
            .join("text")
            .attr("x", d => d.fx)
            .attr("y", d => d.fy)
            .attr("text-anchor", "middle")
            .attr("fill", d => d.color)
            .attr("font-weight", "bold")
            .attr("font-size", "14px")
            .text(d => d.name);

        const node = svg.append("g")
            .selectAll("circle")
            .data(nodes.filter(d => d.type !== 'context'))
            .join("circle")
            .attr("r", d => d.r)
            .attr("fill", d => d.type === 'query' ? 'var(--color-main)' : d.color)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .call(drag(simulation));

        node.append("title")
            .text(d => d.type === 'match' ? `${d.text}\n${(d.similarity * 100).toFixed(1)}%` : "Query");

        // Labels for nodes
        const nodeLabels = svg.append("g")
            .selectAll("text")
            .data(nodes.filter(d => d.type === 'match'))
            .join("text")
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("pointer-events", "none")
            .attr("fill", "#333")
            .text(d => d.text);

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            nodeLabels
                .attr("x", d => d.x)
                .attr("y", d => d.y - d.r - 2);
        });

        function drag(simulation) {
            function dragstarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }

            function dragended(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                // Do NOT nullify fx/fy. This pins the node where it was dropped.
                // d.fx = null;
                // d.fy = null;
            }

            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }

    }, [queryText, results]);

    return (
        <div ref={wrapperRef} className="w-full" style={{ minHeight: '600px' }}>
            <svg ref={svgRef} className="w-full h-full"></svg>
        </div>
    );
};

export default RadialViz;
