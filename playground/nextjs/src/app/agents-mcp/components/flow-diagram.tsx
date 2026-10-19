'use client';

import { cn } from '@/lib/utils';
import { FLOW_LANES, FLOW_STEPS, type FlowBranch, type FlowLane, type FlowStep, isStepVisible } from './flow-steps';

/**
 * Lane order is locked to the order in `FLOW_LANES` so the diagram stays
 * left-to-right (User -> Channel -> Novu -> Runtime -> MCP).
 */
const LANE_X = Object.fromEntries(FLOW_LANES.map((lane, idx) => [lane.id, idx])) as Record<FlowLane, number>;

const HEADER_HEIGHT = 56;
const ROW_HEIGHT = 38;
const LANE_GAP = 110;
const LEFT_PAD = 56;
const RIGHT_PAD = 32;

/**
 * Hand-rolled SVG sequence diagram. Each visible step renders a single
 * horizontal arrow between two lane lifelines (or a small "think" dot when
 * source === target). The currently-active step gets a primary ring; the
 * completed prefix is muted; everything after the active step is faded.
 *
 * The component is purely presentational — all state comes from props.
 */
export function FlowDiagram({
  activeStepId,
  completedStepIds,
  selectedBranch,
}: {
  activeStepId: string | null;
  completedStepIds: ReadonlySet<string>;
  selectedBranch: FlowBranch | undefined;
}) {
  const visibleSteps = FLOW_STEPS.filter((step) => isStepVisible(step, selectedBranch));
  const width = LEFT_PAD + RIGHT_PAD + (FLOW_LANES.length - 1) * LANE_GAP;
  const height = HEADER_HEIGHT + visibleSteps.length * ROW_HEIGHT + 16;

  return (
    <svg
      role="img"
      aria-label="Agent turn flow"
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-full text-foreground"
      style={{ height }}
    >
      <LaneHeaders />
      <Lifelines stepCount={visibleSteps.length} />
      {visibleSteps.map((step, index) => (
        <StepRow
          key={step.id}
          step={step}
          rowIndex={index}
          active={step.id === activeStepId}
          completed={completedStepIds.has(step.id)}
        />
      ))}
    </svg>
  );
}

function laneCenterX(lane: FlowLane): number {
  return LEFT_PAD + LANE_X[lane] * LANE_GAP;
}

function LaneHeaders() {
  return (
    <g>
      {FLOW_LANES.map((lane) => {
        const x = laneCenterX(lane.id);

        return (
          <g key={lane.id}>
            <rect x={x - 46} y={8} width={92} height={36} rx={8} className="fill-muted stroke-border" strokeWidth={1} />
            <text x={x} y={24} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
              {lane.label}
            </text>
            {lane.sublabel ? (
              <text x={x} y={37} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {lane.sublabel}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function Lifelines({ stepCount }: { stepCount: number }) {
  const bottom = HEADER_HEIGHT + stepCount * ROW_HEIGHT;

  return (
    <g>
      {FLOW_LANES.map((lane) => {
        const x = laneCenterX(lane.id);

        return (
          <line
            key={lane.id}
            x1={x}
            x2={x}
            y1={HEADER_HEIGHT - 6}
            y2={bottom + 6}
            className="stroke-border"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        );
      })}
    </g>
  );
}

function StepRow({
  step,
  rowIndex,
  active,
  completed,
}: {
  step: FlowStep;
  rowIndex: number;
  active: boolean;
  completed: boolean;
}) {
  const y = HEADER_HEIGHT + rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
  const sourceX = laneCenterX(step.source);
  const targetX = step.target ? laneCenterX(step.target) : sourceX;
  const isInternal = !step.target || step.source === step.target;

  // Tone: active = primary, completed = full opacity but muted color,
  // upcoming = faded.
  const tone = active ? 'active' : completed ? 'completed' : 'upcoming';

  return (
    <g>
      {/* Hover/active band across the row */}
      {active ? (
        <rect
          x={0}
          y={y - ROW_HEIGHT / 2 + 2}
          width="100%"
          height={ROW_HEIGHT - 4}
          rx={6}
          className="fill-primary/10"
        />
      ) : null}

      {/* Step number circle in the gutter */}
      <circle
        cx={20}
        cy={y}
        r={11}
        className={cn(
          'transition-colors',
          tone === 'active' && 'fill-primary stroke-primary',
          tone === 'completed' && 'fill-muted stroke-border',
          tone === 'upcoming' && 'fill-transparent stroke-border'
        )}
        strokeWidth={1.5}
      />
      <text
        x={20}
        y={y + 3.5}
        textAnchor="middle"
        className={cn(
          'text-[10px] font-semibold',
          tone === 'active' && 'fill-primary-foreground',
          tone === 'completed' && 'fill-muted-foreground',
          tone === 'upcoming' && 'fill-muted-foreground'
        )}
      >
        {rowIndex + 1}
      </text>

      {/* The arrow / internal dot */}
      {isInternal ? (
        <InternalDot x={sourceX} y={y} tone={tone} />
      ) : (
        <Arrow fromX={sourceX} toX={targetX} y={y} tone={tone} />
      )}

      {/* Branch tag on the right margin */}
      {step.branch ? (
        <BranchPill x={LEFT_PAD + (FLOW_LANES.length - 1) * LANE_GAP + 8} y={y} branch={step.branch} tone={tone} />
      ) : null}
    </g>
  );
}

function Arrow({
  fromX,
  toX,
  y,
  tone,
}: {
  fromX: number;
  toX: number;
  y: number;
  tone: 'active' | 'completed' | 'upcoming';
}) {
  const direction = toX > fromX ? 1 : -1;
  const headSize = 5;
  // Stop the arrow shaft a few pixels short of the target so the head sits cleanly.
  const shaftEnd = toX - direction * headSize;

  return (
    <g>
      <line
        x1={fromX}
        y1={y}
        x2={shaftEnd}
        y2={y}
        className={cn(
          tone === 'active' && 'stroke-primary',
          tone === 'completed' && 'stroke-foreground/70',
          tone === 'upcoming' && 'stroke-border'
        )}
        strokeWidth={tone === 'active' ? 2.25 : 1.75}
      />
      <polygon
        points={`${toX},${y} ${shaftEnd},${y - headSize} ${shaftEnd},${y + headSize}`}
        className={cn(
          tone === 'active' && 'fill-primary',
          tone === 'completed' && 'fill-foreground/70',
          tone === 'upcoming' && 'fill-border'
        )}
      />
    </g>
  );
}

function InternalDot({ x, y, tone }: { x: number; y: number; tone: 'active' | 'completed' | 'upcoming' }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={7}
        className={cn(
          tone === 'active' && 'fill-primary/20 stroke-primary',
          tone === 'completed' && 'fill-muted stroke-foreground/40',
          tone === 'upcoming' && 'fill-transparent stroke-border'
        )}
        strokeWidth={1.5}
      />
      <circle
        cx={x}
        cy={y}
        r={2.5}
        className={cn(
          tone === 'active' && 'fill-primary',
          tone === 'completed' && 'fill-foreground/70',
          tone === 'upcoming' && 'fill-border'
        )}
      />
    </g>
  );
}

function BranchPill({
  x,
  y,
  branch,
  tone,
}: {
  x: number;
  y: number;
  branch: FlowBranch;
  tone: 'active' | 'completed' | 'upcoming';
}) {
  const label = branch === 'hit' ? 'hit' : 'miss';
  const width = 30;

  return (
    <g>
      <rect
        x={x}
        y={y - 8}
        width={width}
        height={16}
        rx={8}
        className={cn(
          'transition-colors',
          branch === 'hit' && tone !== 'upcoming' && 'fill-emerald-500/15 stroke-emerald-500/40',
          branch === 'miss' && tone !== 'upcoming' && 'fill-amber-500/15 stroke-amber-500/40',
          tone === 'upcoming' && 'fill-transparent stroke-border'
        )}
        strokeWidth={1}
      />
      <text
        x={x + width / 2}
        y={y + 3}
        textAnchor="middle"
        className={cn(
          'text-[9px] font-semibold uppercase',
          branch === 'hit' && tone !== 'upcoming' && 'fill-emerald-600',
          branch === 'miss' && tone !== 'upcoming' && 'fill-amber-600',
          tone === 'upcoming' && 'fill-muted-foreground'
        )}
      >
        {label}
      </text>
    </g>
  );
}
