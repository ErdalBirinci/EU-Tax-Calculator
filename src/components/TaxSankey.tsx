import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyCenter } from 'd3-sankey';

interface SankeyData {
  source: string;
  target: string;
  value: number;
  label: string;
}

interface TaxSankeyProps {
  data: SankeyData[];
  width?: number;
  height?: number;
}

export const TaxSankey: React.FC<TaxSankeyProps> = ({ data, width = 600, height = 400 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 150, bottom: 20, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Prepare nodes and links
    const nodesSet = new Set<string>();
    data.forEach(d => {
      nodesSet.add(d.source);
      nodesSet.add(d.target);
    });

    const nodes = Array.from(nodesSet).map(name => ({ name }));
    const nodeMap = new Map(nodes.map((d, i) => [d.name, i]));

    const links = data.map(d => ({
      source: nodeMap.get(d.source)!,
      target: nodeMap.get(d.target)!,
      value: d.value,
      label: d.label
    }));

    const sankeyGenerator = sankey<any, any>()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[0, 0], [innerWidth, innerHeight]])
      .nodeAlign(sankeyCenter);

    const { nodes: sNodes, links: sLinks } = sankeyGenerator({
      nodes: nodes.map(d => Object.assign({}, d)),
      links: links.map(d => Object.assign({}, d))
    });

    // Draw links
    g.append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.2)
      .selectAll('path')
      .data(sLinks)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', '#3B82F6')
      .attr('stroke-width', d => Math.max(1, d.width))
      .on('mouseover', function() { d3.select(this).attr('stroke-opacity', 0.5); })
      .on('mouseout', function() { d3.select(this).attr('stroke-opacity', 0.2); });

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(sNodes)
      .join('g');

    node.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => d.y1 - d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => d.sourceLinks.length === 0 ? '#10B981' : '#3B82F6')
      .attr('rx', 2);

    node.append('text')
      .attr('x', d => d.x0 < innerWidth / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr('y', d => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => d.x0 < innerWidth / 2 ? 'start' : 'end')
      .text(d => d.name)
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1E293B');

  }, [data, width, height]);

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} width={width} height={height} className="mx-auto" />
    </div>
  );
};
