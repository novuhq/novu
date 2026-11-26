import { describe, expect, it } from 'vitest';
import { resolveCopilotEscape } from './use-copilot-hotkey';

const outside = { isInPanel: false, hasNestedOverlay: false, isInOtherDialog: false, isDocked: false };

describe('resolveCopilotEscape', () => {
  it('closes the Copilot when Escape is pressed in it, docked or floating', () => {
    expect(resolveCopilotEscape({ ...outside, isInPanel: true })).toBe('close');
    expect(resolveCopilotEscape({ ...outside, isInPanel: true, isDocked: true })).toBe('close');
  });

  it('leaves Escape to an overlay a reply opened inside the panel, such as the external link check', () => {
    expect(resolveCopilotEscape({ ...outside, isInPanel: true, hasNestedOverlay: true })).toBe('ignore');
    expect(resolveCopilotEscape({ ...outside, hasNestedOverlay: true })).toBe('ignore');
  });

  it('leaves Escape to a dialog the focus is in', () => {
    expect(resolveCopilotEscape({ ...outside, isInOtherDialog: true })).toBe('ignore');
  });

  it('never closes a docked Copilot from the page: it is part of the page, not a layer over it', () => {
    expect(resolveCopilotEscape({ ...outside, isDocked: true })).toBe('ignore');
  });

  it('closes the floating Copilot from the page unless a layer under it takes the Escape first', () => {
    expect(resolveCopilotEscape(outside)).toBe('close-unless-handled');
  });
});
