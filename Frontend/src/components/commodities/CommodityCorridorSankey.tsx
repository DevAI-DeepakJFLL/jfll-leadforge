import React, { useState, useMemo, useRef } from 'react';
import {
  sankey,
  sankeyJustify,
  sankeyLinkHorizontal,
  SankeyGraph,
  SankeyNode,
  SankeyLink,
} from 'd3-sankey';
import {
  GitFork,
  Clock,
} from 'lucide-react';
import { GatewayHubId } from '@/types/freightCommodities';
import {
  SankeyGraphNode,
  SankeyGraphLink,
  buildSankeyData,
} from '@/data/commodityVisualData';

export interface CommodityCorridorSankeyProps {
  selectedMonth: number;
  selectedHub: GatewayHubId;
  onMonthChange: (month: number) => void;
  onHubChange: (hub: GatewayHubId) => void;
  onSelectCommodity?: (commodityName: string) => void;
  className?: string;
}

type CustomSankeyNode = SankeyNode<SankeyGraphNode, SankeyGraphLink>;
type CustomSankeyLink = SankeyLink<SankeyGraphNode, SankeyGraphLink>;

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SVG_WIDTH = 920;
const SVG_HEIGHT = 440;

export const CommodityCorridorSankey: React.FC<CommodityCorridorSankeyProps> = ({
  selectedMonth,
  selectedHub,
  onMonthChange,
  onHubChange,
  onSelectCommodity,
  className = '',
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<CustomSankeyLink | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute raw Sankey graph data
  const rawData = useMemo(() => {
    return buildSankeyData(selectedMonth, selectedHub);
  }, [selectedMonth, selectedHub]);

  // Compute D3 Sankey Layout
  const sankeyLayout: SankeyGraph<SankeyGraphNode, SankeyGraphLink> | null = useMemo(() => {
    if (rawData.nodes.length === 0 || rawData.links.length === 0) return null;

    try {
      const generator = sankey<SankeyGraphNode, SankeyGraphLink>()
        .nodeId((d) => d.id)
        .nodeWidth(18)
        .nodePadding(14)
        .extent([
          [20, 20],
          [SVG_WIDTH - 20, SVG_HEIGHT - 20],
        ])
        .nodeAlign(sankeyJustify);

      // Deep copy to prevent mutation issues across re-renders
      const nodesCopy = rawData.nodes.map((n) => ({ ...n }));
      const linksCopy = rawData.links.map((l) => ({ ...l }));

      return generator({
        nodes: nodesCopy,
        links: linksCopy,
      });
    } catch (err) {
      console.warn('Sankey layout generation error:', err);
      return null;
    }
  }, [rawData]);

  const pathGenerator = useMemo(() => {
    return sankeyLinkHorizontal<SankeyGraphNode, SankeyGraphLink>();
  }, []);

  const handleLinkMouseEnter = (link: CustomSankeyLink, e: React.MouseEvent) => {
    setHoveredLink(link);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: Math.min(Math.max(e.clientX - rect.left, 100), rect.width - 240),
        y: Math.max(e.clientY - rect.top - 80, 20),
      });
    }
  };

  const handleLinkMouseLeave = () => {
    setHoveredLink(null);
    setTooltipPos(null);
  };

  const handleNodeClick = (node: CustomSankeyNode) => {
    if (node.category === 'hub') {
      const hubCode = node.id.replace('hub-', '') as GatewayHubId;
      onHubChange(hubCode);
    } else if (node.category === 'commodity') {
      if (onSelectCommodity) {
        onSelectCommodity(node.name);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3.5 select-none ${className}`}
      role="region"
      aria-label="Multi-Tier Freight Flow Sankey Diagram"
    >
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs">
            <GitFork className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              Multi-Tier Freight Corridor Flow (Sankey)
              <span className="text-[10px] font-normal lowercase font-sans text-slate-400">
                (Hover nodes or ribbons to trace supply paths)
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Interactive flow diagram mapping Indian Gateways ➔ Equipment &amp; Cold Chain ➔ Surging Commodities ➔ Global Trade Corridors
            </p>
          </div>
        </div>

        {/* 4-Stage Column Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block" />
            1. Gateways
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" />
            2. Cold Chain &amp; Equipment
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-purple-600 inline-block" />
            3. Commodities
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-600 inline-block" />
            4. Trade Corridors
          </span>
        </div>
      </div>

      {/* 2. Interactive Month Scrubber */}
      <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-200/80 flex items-center justify-between gap-1 overflow-x-auto">
        <div className="text-[10px] font-bold text-slate-500 uppercase px-1 shrink-0 flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Active Flow Month:</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {MONTH_NAMES.map((mName, idx) => {
            const monthNum = idx + 1;
            const isSelected = selectedMonth === monthNum;
            return (
              <button
                key={mName}
                type="button"
                onClick={() => onMonthChange(monthNum)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs scale-105 ring-2 ring-indigo-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
                title={`Simulate freight flows for Month ${monthNum}: ${FULL_MONTH_NAMES[idx]}`}
              >
                <span>{mName}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. D3 SVG Sankey Canvas */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-slate-900/[0.01] p-2">
        {!sankeyLayout ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No freight flows available for this filter. Try selecting &quot;All 8 Hubs&quot;.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="w-full h-auto min-w-[780px]"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Stage Column Labels */}
            <g className="text-[11px] font-bold uppercase tracking-wider fill-slate-400">
              <text x={30} y={15} textAnchor="start">
                Indian Gateways
              </text>
              <text x={SVG_WIDTH * 0.33} y={15} textAnchor="middle">
                Equipment &amp; Mode
              </text>
              <text x={SVG_WIDTH * 0.66} y={15} textAnchor="middle">
                Surging Commodities
              </text>
              <text x={SVG_WIDTH - 30} y={15} textAnchor="end">
                Global Corridors
              </text>
            </g>

            {/* Links / Ribbons */}
            <g className="links" fill="none">
              {sankeyLayout.links.map((link, idx) => {
                const sourceNode = link.source as CustomSankeyNode;
                const targetNode = link.target as CustomSankeyNode;
                const pathD = pathGenerator(link) || '';

                const isConnectedToHoveredNode =
                  hoveredNodeId === sourceNode.id || hoveredNodeId === targetNode.id;
                const isHovered = hoveredLink === link;

                let strokeOpacity = 0.28;
                let strokeColor = sourceNode.color || '#64748b';

                if (hoveredNodeId) {
                  strokeOpacity = isConnectedToHoveredNode ? 0.75 : 0.08;
                } else if (hoveredLink) {
                  strokeOpacity = isHovered ? 0.85 : 0.12;
                }

                return (
                  <path
                    key={`link-${idx}`}
                    d={pathD}
                    stroke={strokeColor}
                    strokeWidth={Math.max(1.5, link.width || 2)}
                    strokeOpacity={strokeOpacity}
                    className="transition-all duration-150 cursor-pointer hover:stroke-opacity-90"
                    onMouseEnter={(e) => handleLinkMouseEnter(link, e)}
                    onMouseLeave={handleLinkMouseLeave}
                  />
                );
              })}
            </g>

            {/* Nodes */}
            <g className="nodes">
              {sankeyLayout.nodes.map((node) => {
                const isHovered = hoveredNodeId === node.id;
                const isHub = node.category === 'hub';
                const isCommodity = node.category === 'commodity';
                const nodeWidth = (node.x1 || 0) - (node.x0 || 0);
                const nodeHeight = Math.max(4, (node.y1 || 0) - (node.y0 || 0));

                const isLeftHalf = (node.x0 || 0) < SVG_WIDTH / 2;

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer group"
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                  >
                    {/* Node Rectangle */}
                    <rect
                      x={node.x0}
                      y={node.y0}
                      width={nodeWidth}
                      height={nodeHeight}
                      rx={3}
                      fill={node.color}
                      className={`transition-all duration-200 ${
                        isHovered ? 'brightness-125 stroke-2 stroke-white shadow-md' : 'opacity-90 hover:opacity-100'
                      }`}
                    />

                    {/* Node Text Label */}
                    <text
                      x={isLeftHalf ? (node.x1 || 0) + 8 : (node.x0 || 0) - 8}
                      y={(node.y0 || 0) + nodeHeight / 2}
                      dy="0.35em"
                      textAnchor={isLeftHalf ? 'start' : 'end'}
                      className={`text-[11px] font-semibold transition-colors ${
                        isHovered ? 'fill-blue-700 font-bold' : 'fill-slate-800'
                      }`}
                    >
                      {node.name}
                    </text>

                    {/* Node Subtext / Indicator */}
                    {(isHub || isCommodity) && (
                      <title>{`${node.name} (Click to filter)`}</title>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>

      {/* 4. Floating Ribbon Tooltip */}
      {hoveredLink && (
        <div
          className="absolute z-30 w-64 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-xs pointer-events-none transition-all duration-100 border border-slate-700"
          style={{
            left: `${tooltipPos?.x || 120}px`,
            top: `${tooltipPos?.y || 60}px`,
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span className="font-mono font-bold text-indigo-400 text-[10px]">
              Active Freight Corridor
            </span>
            <span className="text-[10px] text-slate-400">Flow Unit: {hoveredLink.value}</span>
          </div>

          <div className="space-y-1 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">From:</span>
              <span className="font-semibold text-slate-100">
                {(hoveredLink.source as CustomSankeyNode).name}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">To:</span>
              <span className="font-semibold text-slate-100">
                {(hoveredLink.target as CustomSankeyNode).name}
              </span>
            </div>
            {hoveredLink.commodity && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">Cargo:</span>
                <span className="text-purple-300 font-medium">{hoveredLink.commodity}</span>
              </div>
            )}
            {hoveredLink.equipment && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">Spec:</span>
                <span className="text-emerald-300 font-mono text-[10px]">{hoveredLink.equipment}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Bottom Context Strip */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/70">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            {`Active Month: ${FULL_MONTH_NAMES[selectedMonth - 1]}`}
          </span>
          <span className="text-slate-400 hidden md:inline">•</span>
          <span className="text-[11px] text-slate-500 hidden md:inline">
            Click any gateway node on the left to filter by hub, or click any commodity to filter sales leads.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedHub !== 'ALL' && (
            <button
              type="button"
              onClick={() => onHubChange('ALL')}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            >
              Reset to All 8 Hubs
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
