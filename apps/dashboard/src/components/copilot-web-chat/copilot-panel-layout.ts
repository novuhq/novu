/** Docked, the page makes room for the Copilot on its right; floating, it sits over the page wherever it was dragged. */
export type CopilotPanelMode = 'docked' | 'floating';

/** Top-left corner of a floating panel the user dragged, in viewport pixels. */
export type CopilotFloatingPosition = { left: number; top: number };

/** What the user chose, kept across pages and reloads. No `position` floats it above the launcher. */
export type CopilotPanelLayout = { mode: CopilotPanelMode; position?: CopilotFloatingPosition };

export type CopilotViewport = { width: number; height: number };

/** Where the panel shows right now: a docked choice floats where the page has no room for it. */
export type CopilotPanelPlacement =
  | { kind: 'docked'; top: number }
  | { kind: 'anchored' }
  | { kind: 'free'; position: CopilotFloatingPosition };

export const COPILOT_PANEL_WIDTH = 400;
export const COPILOT_FLOATING_MAX_HEIGHT = 600;
/** Narrower than this, a 400px dock leaves the page too little room, so the panel floats. */
export const COPILOT_DOCK_MIN_VIEWPORT_WIDTH = 1280;
/** Gap a floating panel keeps from the viewport's edges and from the top bar. */
export const COPILOT_FLOATING_GAP = 8;
/** Dropping a dragged panel with the pointer this close to the viewport's right edge docks it. */
export const COPILOT_DOCK_ZONE_WIDTH = 48;
/** The dashboard's top bar (`HeaderNavigation`), for a page whose layout has no dock slot to measure. */
const TOP_BAR_HEIGHT = 48;
/** Above the launcher: 12px over its 38px pill at bottom-4. */
const ANCHORED_BOTTOM = 66;

const DEFAULT_LAYOUT: CopilotPanelLayout = { mode: 'docked' };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** The stored choice, or docked when nothing (or something unreadable) is stored. */
export function parseCopilotPanelLayout(raw: string | null | undefined): CopilotPanelLayout {
  if (!raw) return DEFAULT_LAYOUT;

  try {
    const value = JSON.parse(raw) as { mode?: unknown; position?: { left?: unknown; top?: unknown } } | null;
    if (value?.mode !== 'docked' && value?.mode !== 'floating') return DEFAULT_LAYOUT;

    const { left, top } = value.position ?? {};
    const position = isFiniteNumber(left) && isFiniteNumber(top) ? { left, top } : undefined;

    return position ? { mode: value.mode, position } : { mode: value.mode };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

/** The highest a floating panel goes: under the top bar, with a gap. */
export function getCopilotTopLimit(dockTop: number | undefined): number {
  return (dockTop ?? TOP_BAR_HEIGHT) + COPILOT_FLOATING_GAP;
}

type DockContext = {
  /** The top of the page layout's dock slot, under its top bar; `undefined` when the page has none. */
  dockTop: number | undefined;
  viewport: CopilotViewport;
};

export function canCopilotDock({ dockTop, viewport }: DockContext): boolean {
  return dockTop !== undefined && viewport.width >= COPILOT_DOCK_MIN_VIEWPORT_WIDTH;
}

/** Where a docked panel starts: under the top bar, or at the very top beside a sheet, which covers the top bar too. */
export function getCopilotDockedTop({ dockTop, isOverSheet }: { dockTop: number; isOverSheet: boolean }): number {
  return isOverSheet ? 0 : dockTop;
}

export function resolveCopilotPanelPlacement({
  layout,
  dockTop,
  viewport,
  isOverSheet = false,
}: DockContext & { layout: CopilotPanelLayout; isOverSheet?: boolean }): CopilotPanelPlacement {
  if (layout.mode === 'docked' && dockTop !== undefined && canCopilotDock({ dockTop, viewport })) {
    return { kind: 'docked', top: getCopilotDockedTop({ dockTop, isOverSheet }) };
  }

  return layout.position ? { kind: 'free', position: layout.position } : { kind: 'anchored' };
}

/** Bottom edge of the panel floating above the launcher, which rises with the launcher over a sheet's footer. */
export function getCopilotAnchoredBottom(sheetLift: number): number {
  return ANCHORED_BOTTOM + sheetLift;
}

/** Up to 600px, shortened so the panel stays under the top bar and inside the viewport. */
export function getCopilotFloatingHeight({
  viewportHeight,
  topLimit,
  bottomGap,
}: {
  viewportHeight: number;
  topLimit: number;
  bottomGap: number;
}): number {
  return Math.max(0, Math.min(COPILOT_FLOATING_MAX_HEIGHT, viewportHeight - topLimit - bottomGap));
}

/** Keeps a floating panel inside the viewport and under the top bar, after a drag or a resize of the window. */
export function clampCopilotFloatingPosition(
  position: CopilotFloatingPosition,
  { viewport, height, topLimit }: { viewport: CopilotViewport; height: number; topLimit: number }
): CopilotFloatingPosition {
  const maxLeft = viewport.width - COPILOT_PANEL_WIDTH - COPILOT_FLOATING_GAP;
  const maxTop = viewport.height - height - COPILOT_FLOATING_GAP;

  return {
    left: Math.round(Math.max(COPILOT_FLOATING_GAP, Math.min(position.left, maxLeft))),
    top: Math.round(Math.max(topLimit, Math.min(position.top, maxTop))),
  };
}

export function isInCopilotDockZone(pointerX: number, viewportWidth: number): boolean {
  return pointerX >= viewportWidth - COPILOT_DOCK_ZONE_WIDTH;
}
