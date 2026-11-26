// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COPILOT_POPOVER_ID } from './copilot-web-chat-utils';
import { resolveCopilotEscape, useCopilotHotkey } from './use-copilot-hotkey';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function Hotkeys({ close }: { close: () => void }) {
  useCopilotHotkey({ surface: 'popover', isOpen: true, isEnabled: true, open: () => {}, toggle: () => {}, close });

  return null;
}

function pressEscape(target: Element) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

describe('useCopilotHotkey Escape', () => {
  let root: Root;
  let close: ReturnType<typeof vi.fn<() => void>>;
  let composer: HTMLTextAreaElement;
  let pageButton: HTMLButtonElement;
  const documentListeners: Array<{ listener: (event: KeyboardEvent) => void; capture: boolean }> = [];

  function renderPanel(placement: 'anchored' | 'docked') {
    const panel = document.createElement('div');
    panel.id = COPILOT_POPOVER_ID;
    panel.dataset.copilotPlacement = placement;
    composer = document.createElement('textarea');
    panel.append(composer);
    pageButton = document.createElement('button');
    document.body.append(pageButton, panel);
    act(() => root.render(createElement(Hotkeys, { close })));

    return panel;
  }

  function listenOnDocument(listener: (event: KeyboardEvent) => void, capture = false) {
    documentListeners.push({ listener, capture });
    document.addEventListener('keydown', listener, capture);
  }

  /** Streamdown's link check: rendered inside the panel and closed by a document listener that leaves the event unhandled. */
  function openLinkCheck(panel: HTMLElement) {
    const overlay = document.createElement('div');
    overlay.dataset.streamdown = 'link-safety-modal';
    overlay.className = 'fixed inset-0 z-50';
    panel.append(overlay);
    listenOnDocument((event) => {
      if (event.key === 'Escape') overlay.remove();
    });

    return overlay;
  }

  beforeEach(() => {
    close = vi.fn<() => void>();
    root = createRoot(document.createElement('div'));
  });

  afterEach(() => {
    act(() => root.unmount());
    for (const { listener, capture } of documentListeners.splice(0)) {
      document.removeEventListener('keydown', listener, capture);
    }
    document.body.replaceChildren();
  });

  it('leaves Escape to the link check inside the panel, then closes on the next Escape', () => {
    const overlay = openLinkCheck(renderPanel('anchored'));

    pressEscape(composer);
    expect(overlay.isConnected).toBe(false);
    expect(close).not.toHaveBeenCalled();

    pressEscape(composer);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape in the panel without letting a sheet under it see the key', () => {
    renderPanel('anchored');
    const sheetEscape = vi.fn();
    listenOnDocument(sheetEscape, true);

    pressEscape(composer);
    expect(close).toHaveBeenCalledTimes(1);
    expect(sheetEscape).not.toHaveBeenCalled();
  });

  it('stays open when a layer under the floating panel takes the Escape, and closes when none does', () => {
    renderPanel('anchored');
    // A Radix layer marks the Escape it dismisses on.
    const radixLayer = (event: KeyboardEvent) => event.preventDefault();
    listenOnDocument(radixLayer, true);

    pressEscape(pageButton);
    expect(close).not.toHaveBeenCalled();

    document.removeEventListener('keydown', radixLayer, true);
    pressEscape(pageButton);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('never closes a docked panel from the page, only from inside it', () => {
    renderPanel('docked');

    pressEscape(pageButton);
    expect(close).not.toHaveBeenCalled();

    pressEscape(composer);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
