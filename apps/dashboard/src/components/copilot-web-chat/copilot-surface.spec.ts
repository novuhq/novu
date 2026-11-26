import { describe, expect, it } from 'vitest';
import { COPILOT_SURFACE_PROPS, isInCopilotSurface } from './copilot-surface';

type FakeElement = {
  attributes: Record<string, string>;
  parent?: FakeElement;
  closest: (selector: string) => FakeElement | null;
};

// A stand-in for a DOM element: `closest` finds the nearest node with the marker, as the browser's does.
function element(attributes: Record<string, string>, parent?: FakeElement): FakeElement {
  const node: FakeElement = {
    attributes,
    parent,
    closest(selector) {
      const name = selector.match(/^\[([\w-]+)\]$/)?.[1];
      for (let current: FakeElement | undefined = node; current; current = current.parent) {
        if (name && name in current.attributes) return current;
      }

      return null;
    },
  };

  return node;
}

describe('isInCopilotSurface', () => {
  it('is true for the Copilot surface and anything inside it', () => {
    const popover = element({ ...COPILOT_SURFACE_PROPS });
    const composer = element({}, element({}, popover));

    expect(isInCopilotSurface(popover as unknown as EventTarget)).toBe(true);
    expect(isInCopilotSurface(composer as unknown as EventTarget)).toBe(true);
  });

  it('is false outside the Copilot', () => {
    const pageButton = element({}, element({ id: 'root' }));

    expect(isInCopilotSurface(pageButton as unknown as EventTarget)).toBe(false);
  });

  it('is false for a target that is not an element', () => {
    expect(isInCopilotSurface(null)).toBe(false);
    expect(isInCopilotSurface({} as EventTarget)).toBe(false);
  });
});
