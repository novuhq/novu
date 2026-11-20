import type { OutletStore } from './OutletStore';

const scopes = new WeakMap<Element, OutletStore>();

/** Remembers which outlet scope a mount point belongs to, so outlets the engine opens inside it can find their host. */
export const registerMountPoint = (element: Element, outlets: OutletStore) => {
  scopes.set(element, outlets);

  return () => {
    scopes.delete(element);
  };
};

/**
 * The scope that owns an outlet the engine rendered at `element`: the one of the nearest mount point around it.
 *
 * Icon overrides are adapted once, in `NovuUI`, so they cannot know which component the engine will render them
 * for; an icon inside `<Bell />` must still be hosted beneath `Bell`, or a wrapper around the bell never sees its
 * clicks. Outlets outside every mount point, such as those inside the engine's own popover, use `fallback`.
 */
export const outletScopeFor = (element: Element, fallback: OutletStore): OutletStore => {
  let node: Node | null = element;

  while (node) {
    if (node instanceof Element) {
      const scope = scopes.get(node);
      if (scope) {
        return scope;
      }
    }

    node = node instanceof ShadowRoot ? node.host : node.parentNode;
  }

  return fallback;
};
