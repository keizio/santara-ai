'use client';

import { useMemo, useState } from 'react';
import type { OwnershipNode, OwnershipReport } from '@santara/shared';
import { percent } from '@/lib/format';

const WIDTH = 720;
const HEIGHT = 420;

const NODE_STYLE: Record<OwnershipNode['kind'], string> = {
  target: 'fill-sky-500',
  'ultimate-parent': 'fill-violet-500',
  parent: 'fill-indigo-500',
  sister: 'fill-emerald-500',
  shareholder: 'fill-slate-500',
};

const ROW_ORDER: OwnershipNode['kind'][] = [
  'ultimate-parent',
  'parent',
  'shareholder',
  'target',
  'sister',
];

interface Positioned {
  node: OwnershipNode;
  x: number;
  y: number;
}

/**
 * Layered ownership layout: control flows top (ultimate parent) to bottom
 * (target and its listed sisters), so cross-holdings read as a chain.
 */
function layout(nodes: OwnershipNode[]): Map<string, Positioned> {
  const rows = ROW_ORDER.map((kind) => nodes.filter((node) => node.kind === kind)).filter(
    (row) => row.length > 0,
  );
  const positions = new Map<string, Positioned>();
  const rowGap = HEIGHT / (rows.length + 1);

  rows.forEach((row, rowIndex) => {
    const colGap = WIDTH / (row.length + 1);
    row.forEach((node, colIndex) => {
      positions.set(node.id, {
        node,
        x: colGap * (colIndex + 1),
        y: rowGap * (rowIndex + 1),
      });
    });
  });

  return positions;
}

export function OwnershipGraph({ report }: { report: OwnershipReport }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const positions = useMemo(() => layout(report.graph.nodes), [report.graph.nodes]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-100">Conglomerate structure</h3>
        <p className="text-xs text-slate-400">
          {report.ultimateParent ? `Ultimate parent: ${report.ultimateParent}` : 'No parent found'}
          {report.conglomerate ? ` · ${report.conglomerate.name}` : ''}
        </p>
      </header>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-4 h-[420px] w-full"
        role="img"
        aria-label={`Ownership graph for ${report.ticker}`}
      >
        {report.graph.edges.map((edge) => {
          const from = positions.get(edge.source);
          const to = positions.get(edge.target);
          if (!from || !to) return null;
          const active = hovered === edge.source || hovered === edge.target;
          return (
            <g key={`${edge.source}->${edge.target}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                strokeWidth={active ? 2.5 : 1.2}
                className={active ? 'stroke-sky-400' : 'stroke-slate-700'}
              />
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 4}
                textAnchor="middle"
                className="fill-slate-400 text-[10px]"
              >
                {edge.sharePercent > 0 ? percent(edge.sharePercent) : ''}
              </text>
            </g>
          );
        })}

        {[...positions.values()].map(({ node, x, y }) => (
          <g
            key={node.id}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
          >
            <circle
              cx={x}
              cy={y}
              r={node.kind === 'target' ? 16 : 11}
              className={`${NODE_STYLE[node.kind]} ${hovered === node.id ? 'opacity-100' : 'opacity-80'}`}
            />
            {node.foreign && (
              <circle cx={x} cy={y} r={node.kind === 'target' ? 20 : 15} className="fill-none stroke-amber-400/70" />
            )}
            <text x={x} y={y + 30} textAnchor="middle" className="fill-slate-200 text-[11px]">
              {node.ticker ?? truncate(node.label)}
            </text>
            {node.sharePercent !== undefined && (
              <text x={x} y={y + 43} textAnchor="middle" className="fill-slate-500 text-[10px]">
                {percent(node.sharePercent)}
              </text>
            )}
          </g>
        ))}
      </svg>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Top holder concentration" value={percent(report.topHolderConcentration)} />
        <Stat label="Foreign ownership" value={percent(report.foreignOwnershipPercent)} />
        <Stat label="Public float" value={percent(report.publicFloatPercent)} />
      </div>

      {report.risks.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-amber-200">
          {report.risks.map((risk) => (
            <li key={risk}>• {risk}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function truncate(label: string): string {
  return label.length > 16 ? `${label.slice(0, 15)}…` : label;
}
