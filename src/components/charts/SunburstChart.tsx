import { useState, useMemo, FC } from 'react';
import { DiskTreeNode } from '../../lib/commands';
import { formatSize } from '../../lib/utils';
import { ArrowUp, Folder, File, CornerDownRight } from 'lucide-react';

interface SunburstChartProps {
  rootNode: DiskTreeNode;
  onNavigateInto: (node: DiskTreeNode) => void;
  onNavigateBack?: () => void;
  canNavigateBack?: boolean;
}

interface ArcData {
  id: string;
  node: DiskTreeNode;
  depth: number;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  color: string;
  strokeColor: string;
  percentOfTotal: number;
}

const PALETTE = [
  { fill: '#0A84FF', stroke: '#0066D6' }, // macOS Blue
  { fill: '#5E5CE6', stroke: '#4745C9' }, // macOS Indigo
  { fill: '#BF5AF2', stroke: '#9E3CD6' }, // macOS Purple
  { fill: '#FF375F', stroke: '#D91E44' }, // macOS Pink
  { fill: '#FF9F0A', stroke: '#D68200' }, // macOS Orange
  { fill: '#30D158', stroke: '#1FB343' }, // macOS Green
  { fill: '#64D2FF', stroke: '#36ACD9' }, // macOS Teal/Cyan
  { fill: '#FFD60A', stroke: '#D6AD00' }, // macOS Yellow
  { fill: '#FF453A', stroke: '#D62319' }, // macOS Red
  { fill: '#34C759', stroke: '#248A3D' }, // macOS Mint
];

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInRadians: number) {
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const arcLength = endAngle - startAngle;
  // If arc is almost a complete circle, clamp slightly to avoid SVG rendering bug
  const clampedEndAngle = arcLength >= Math.PI * 2 ? startAngle + Math.PI * 1.9999 : endAngle;

  const startOut = polarToCartesian(x, y, outerRadius, clampedEndAngle);
  const endOut = polarToCartesian(x, y, outerRadius, startAngle);
  const startIn = polarToCartesian(x, y, innerRadius, startAngle);
  const endIn = polarToCartesian(x, y, innerRadius, clampedEndAngle);

  const largeArcFlag = arcLength > Math.PI ? 1 : 0;

  return [
    `M ${endOut.x} ${endOut.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${startOut.x} ${startOut.y}`,
    `L ${endIn.x} ${endIn.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startIn.x} ${startIn.y}`,
    'Z',
  ].join(' ');
}

export const SunburstChart: FC<SunburstChartProps> = ({
  rootNode,
  onNavigateInto,
  onNavigateBack,
  canNavigateBack = false,
}) => {
  const [hoveredArc, setHoveredArc] = useState<ArcData | null>(null);

  const size = 520;
  const center = size / 2;
  const innerR = 85;
  const ring1W = 75;
  const ring2W = 65;

  const totalSize = rootNode.size || 1;

  // Build arcs for Depth 1 and Depth 2
  const arcs = useMemo<ArcData[]>(() => {
    const result: ArcData[] = [];
    if (!rootNode.children || rootNode.children.length === 0) return result;

    let currentAngle = -Math.PI / 2; // Start at 12 o'clock

    // Filter significant children (> 0.5% of total size)
    const validChildren = rootNode.children.filter((c) => c.size > 0);
    const displayedChildren = validChildren.slice(0, 16);

    displayedChildren.forEach((child, idx) => {
      const share = child.size / totalSize;
      const sweep = share * Math.PI * 2;
      const start = currentAngle;
      const end = currentAngle + sweep;
      const colorScheme = PALETTE[idx % PALETTE.length];

      // Layer 1 (Depth 1) Arc
      const depth1Arc: ArcData = {
        id: child.id,
        node: child,
        depth: 1,
        startAngle: start,
        endAngle: end,
        innerRadius: innerR,
        outerRadius: innerR + ring1W,
        color: colorScheme.fill,
        strokeColor: colorScheme.stroke,
        percentOfTotal: Math.round(share * 100),
      };
      result.push(depth1Arc);

      // Layer 2 (Depth 2) Arcs for grandchildren
      if (child.children && child.children.length > 0 && child.size > 0) {
        let subAngle = start;
        const subChildren = child.children.filter((sc) => sc.size > 0).slice(0, 10);
        subChildren.forEach((subChild) => {
          const subShare = subChild.size / child.size;
          const subSweep = subShare * sweep;
          const subStart = subAngle;
          const subEnd = subAngle + subSweep;

          // Slightly lighter/translucent tone of parent color
          result.push({
            id: subChild.id,
            node: subChild,
            depth: 2,
            startAngle: subStart,
            endAngle: subEnd,
            innerRadius: innerR + ring1W + 4,
            outerRadius: innerR + ring1W + 4 + ring2W,
            color: colorScheme.fill,
            strokeColor: colorScheme.stroke,
            percentOfTotal: Math.round((subChild.size / totalSize) * 100),
          });

          subAngle = subEnd;
        });
      }

      currentAngle = end;
    });

    return result;
  }, [rootNode, totalSize]);

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-3xl glass-panel border border-black/4 dark:border-white/6 relative overflow-hidden">
      {/* Dynamic Hover Details Pill Header */}
      <div className="h-14 w-full flex items-center justify-center text-center px-4 transition-all">
        {hoveredArc ? (
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl glass-pill animate-fade-in shadow-sm border border-black/5 dark:border-white/10">
            <div
              className="w-3 h-3 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: hoveredArc.color }}
            />
            <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-neutral-100 font-bold max-w-sm truncate">
              {hoveredArc.node.isDir ? (
                <Folder size={14} className="text-accent shrink-0" />
              ) : (
                <File size={14} className="text-slate-400 shrink-0" />
              )}
              <span className="truncate">{hoveredArc.node.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 dark:text-neutral-400">
              <span className="text-accent">{formatSize(hoveredArc.node.size)}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-slate-600 dark:text-neutral-300">
                {hoveredArc.percentOfTotal}%
              </span>
              {hoveredArc.node.isDir && (
                <span className="text-[10px] font-sans text-slate-400">
                  ({hoveredArc.node.fileCount} files)
                </span>
              )}
            </div>
            {hoveredArc.node.isDir && (
              <span className="text-[10px] text-accent flex items-center gap-0.5 ml-1 font-sans">
                <CornerDownRight size={10} /> click to open
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-neutral-500 font-medium">
            Hover any sector to inspect file breakdown • Click a folder slice to dive in
          </p>
        )}
      </div>

      {/* SVG Multi-Ring Canvas */}
      <div className="relative flex items-center justify-center my-2">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible select-none"
        >
          <defs>
            <filter id="sunburst-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Arcs */}
          {arcs.map((arc) => {
            const isHovered = hoveredArc?.id === arc.id;
            const isChildOfHovered =
              hoveredArc?.depth === 1 && arc.depth === 2 && arc.node.path.startsWith(hoveredArc.node.path);

            const pathD = describeArc(
              center,
              center,
              arc.innerRadius,
              arc.outerRadius,
              arc.startAngle,
              arc.endAngle
            );

            // Calculate opacity based on depth and hover states
            let opacity = arc.depth === 1 ? 0.88 : 0.65;
            if (hoveredArc) {
              opacity = isHovered ? 1 : isChildOfHovered ? 0.9 : 0.25;
            }

            return (
              <path
                key={`${arc.id}-${arc.depth}`}
                d={pathD}
                fill={arc.color}
                fillOpacity={opacity}
                stroke="currentColor"
                strokeWidth={isHovered ? 2 : 1}
                className={`transition-all duration-200 cursor-pointer text-white/30 dark:text-black/40 ${
                  isHovered ? 'scale-[1.015] origin-center drop-shadow-md' : ''
                }`}
                onMouseEnter={() => setHoveredArc(arc)}
                onMouseLeave={() => setHoveredArc(null)}
                onClick={() => {
                  if (arc.node.isDir) {
                    onNavigateInto(arc.node);
                  }
                }}
              />
            );
          })}

          {/* Central Hub Disc */}
          <circle
            cx={center}
            cy={center}
            r={innerR - 6}
            className="fill-white dark:fill-neutral-900 stroke-black/6 dark:stroke-white/10 shadow-lg cursor-pointer transition-all duration-200 hover:scale-105 origin-center"
            onClick={() => {
              if (canNavigateBack && onNavigateBack) {
                onNavigateBack();
              }
            }}
          />
        </svg>

        {/* Center Label Overlay */}
        <div
          onClick={() => {
            if (canNavigateBack && onNavigateBack) {
              onNavigateBack();
            }
          }}
          className={`absolute flex flex-col items-center justify-center text-center p-3 w-36 h-36 rounded-full select-none ${
            canNavigateBack ? 'cursor-pointer hover:bg-accent/5 transition-colors' : ''
          }`}
        >
          {canNavigateBack && (
            <div className="flex items-center gap-1 text-[10px] text-accent font-bold mb-0.5">
              <ArrowUp size={11} /> Back
            </div>
          )}
          <span className="text-xs font-bold text-slate-800 dark:text-neutral-100 truncate w-full px-2" title={rootNode.name}>
            {rootNode.name}
          </span>
          <span className="text-sm font-black font-mono text-accent mt-0.5">
            {formatSize(rootNode.size)}
          </span>
          <span className="text-[10px] font-medium text-slate-400 dark:text-neutral-500 mt-0.5">
            {rootNode.fileCount.toLocaleString()} files
          </span>
        </div>
      </div>

      {/* Ring legend footer */}
      <div className="flex items-center gap-6 text-[11px] text-slate-400 dark:text-neutral-500 mt-2 font-medium">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-accent/90" />
          <span>Inner Ring: Top Folders</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-accent/50" />
          <span>Outer Ring: Sub-elements</span>
        </div>
      </div>
    </div>
  );
};
export default SunburstChart;
