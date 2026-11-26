import { describe, expect, it } from 'vitest';
import {
  COPILOT_DOCK_MIN_VIEWPORT_WIDTH,
  COPILOT_FLOATING_MAX_HEIGHT,
  COPILOT_PANEL_WIDTH,
  canCopilotDock,
  clampCopilotFloatingPosition,
  getCopilotFloatingHeight,
  getCopilotTopLimit,
  isInCopilotDockZone,
  parseCopilotPanelLayout,
  resolveCopilotPanelPlacement,
} from './copilot-panel-layout';

const wide = { width: 1440, height: 900 };
const narrow = { width: 1024, height: 700 };

describe('parseCopilotPanelLayout', () => {
  it('docks by default when nothing is stored', () => {
    expect(parseCopilotPanelLayout(null)).toEqual({ mode: 'docked' });
    expect(parseCopilotPanelLayout('')).toEqual({ mode: 'docked' });
  });

  it('reads a stored choice and floating position', () => {
    expect(parseCopilotPanelLayout('{"mode":"floating","position":{"left":120,"top":80}}')).toEqual({
      mode: 'floating',
      position: { left: 120, top: 80 },
    });
    expect(parseCopilotPanelLayout('{"mode":"docked","position":{"left":120,"top":80}}')).toEqual({
      mode: 'docked',
      position: { left: 120, top: 80 },
    });
  });

  it('drops a position that is not two numbers', () => {
    expect(parseCopilotPanelLayout('{"mode":"floating","position":{"left":"120","top":80}}')).toEqual({
      mode: 'floating',
    });
  });

  it('falls back to docked for anything unreadable', () => {
    expect(parseCopilotPanelLayout('not json')).toEqual({ mode: 'docked' });
    expect(parseCopilotPanelLayout('{"mode":"sideways"}')).toEqual({ mode: 'docked' });
    expect(parseCopilotPanelLayout('null')).toEqual({ mode: 'docked' });
  });
});

describe('resolveCopilotPanelPlacement', () => {
  it('docks under the top bar when the page has a dock slot and room for it', () => {
    expect(resolveCopilotPanelPlacement({ layout: { mode: 'docked' }, dockTop: 48, viewport: wide })).toEqual({
      kind: 'docked',
      top: 48,
    });
  });

  it('floats above the launcher when docking is not possible and it was never dragged', () => {
    expect(resolveCopilotPanelPlacement({ layout: { mode: 'docked' }, dockTop: 48, viewport: narrow })).toEqual({
      kind: 'anchored',
    });
    expect(resolveCopilotPanelPlacement({ layout: { mode: 'docked' }, dockTop: undefined, viewport: wide })).toEqual({
      kind: 'anchored',
    });
  });

  it('floats where it was dragged', () => {
    const position = { left: 200, top: 120 };

    expect(
      resolveCopilotPanelPlacement({ layout: { mode: 'floating', position }, dockTop: 48, viewport: wide })
    ).toEqual({ kind: 'free', position });
    expect(
      resolveCopilotPanelPlacement({ layout: { mode: 'docked', position }, dockTop: 48, viewport: narrow })
    ).toEqual({ kind: 'free', position });
  });

  it('floats above the launcher when undocked without a dragged position', () => {
    expect(resolveCopilotPanelPlacement({ layout: { mode: 'floating' }, dockTop: 48, viewport: wide })).toEqual({
      kind: 'anchored',
    });
  });
});

describe('canCopilotDock', () => {
  it('needs a dock slot and a window at least as wide as the threshold', () => {
    const atThreshold = { width: COPILOT_DOCK_MIN_VIEWPORT_WIDTH, height: 800 };
    const belowThreshold = { width: COPILOT_DOCK_MIN_VIEWPORT_WIDTH - 1, height: 800 };

    expect(canCopilotDock({ dockTop: 48, viewport: atThreshold })).toBe(true);
    expect(canCopilotDock({ dockTop: 48, viewport: belowThreshold })).toBe(false);
    expect(canCopilotDock({ dockTop: undefined, viewport: atThreshold })).toBe(false);
  });
});

describe('getCopilotFloatingHeight', () => {
  it('is 600px when the window has room', () => {
    expect(getCopilotFloatingHeight({ viewportHeight: 900, topLimit: 56, bottomGap: 66 })).toBe(
      COPILOT_FLOATING_MAX_HEIGHT
    );
  });

  it('shortens so the panel above the launcher stays under the top bar on a short window', () => {
    const topLimit = getCopilotTopLimit(48);
    const height = getCopilotFloatingHeight({ viewportHeight: 700, topLimit, bottomGap: 66 });

    expect(height).toBe(578);
    expect(700 - 66 - height).toBe(topLimit);
  });

  it('never goes negative', () => {
    expect(getCopilotFloatingHeight({ viewportHeight: 80, topLimit: 56, bottomGap: 66 })).toBe(0);
  });
});

describe('clampCopilotFloatingPosition', () => {
  const height = 600;
  const topLimit = getCopilotTopLimit(48);

  it('keeps a position that fits', () => {
    expect(clampCopilotFloatingPosition({ left: 300, top: 120 }, { viewport: wide, height, topLimit })).toEqual({
      left: 300,
      top: 120,
    });
  });

  it('stops under the top bar', () => {
    expect(clampCopilotFloatingPosition({ left: 300, top: 0 }, { viewport: wide, height, topLimit })).toEqual({
      left: 300,
      top: 56,
    });
  });

  it('keeps the whole panel inside the window', () => {
    expect(clampCopilotFloatingPosition({ left: 5000, top: 5000 }, { viewport: wide, height, topLimit })).toEqual({
      left: wide.width - COPILOT_PANEL_WIDTH - 8,
      top: wide.height - height - 8,
    });
    expect(clampCopilotFloatingPosition({ left: -200, top: 120 }, { viewport: wide, height, topLimit })).toEqual({
      left: 8,
      top: 120,
    });
  });

  it('brings a stored position back into a window that got smaller', () => {
    expect(clampCopilotFloatingPosition({ left: 1000, top: 280 }, { viewport: narrow, height: 578, topLimit })).toEqual(
      { left: narrow.width - COPILOT_PANEL_WIDTH - 8, top: 114 }
    );
  });
});

describe('getCopilotTopLimit', () => {
  it('sits under the measured top bar, or a 48px one when the page has no dock slot', () => {
    expect(getCopilotTopLimit(84)).toBe(92);
    expect(getCopilotTopLimit(undefined)).toBe(56);
  });
});

describe('isInCopilotDockZone', () => {
  it('is the strip along the right edge', () => {
    expect(isInCopilotDockZone(1430, 1440)).toBe(true);
    expect(isInCopilotDockZone(1392, 1440)).toBe(true);
    expect(isInCopilotDockZone(1391, 1440)).toBe(false);
  });
});
