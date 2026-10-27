export const MINTLIFY_TRIGGER_HIDE_STYLE_ID = 'novu-hide-mintlify-trigger';

type MintlifyTriggerHiderGlobal = typeof globalThis & {
  __novuMintlifyTriggerHiderInstalled?: boolean;
};

/**
 * Mintlify paints "Ask assistant" inside a closed shadow root, and its own
 * :host styles beat any page rule, including display:none !important on the host.
 * Capture the shadow root as it is created and hide only the launcher there.
 *
 * The style id and CSS live inside this function so Playwright can install the
 * same source in a page via addInitScript.
 */
export function installMintlifyTriggerHider(): void {
  const styleId = 'novu-hide-mintlify-trigger';
  const css = `
    [data-mintlify-assistant-trigger] {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  const globalScope = globalThis as MintlifyTriggerHiderGlobal;

  if (globalScope.__novuMintlifyTriggerHiderInstalled === true) {
    return;
  }

  globalScope.__novuMintlifyTriggerHiderInstalled = true;

  const originalAttachShadow = Element.prototype.attachShadow;

  function hideTriggerInShadow(root: ShadowRoot): void {
    if (root.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    root.appendChild(style);
  }

  Element.prototype.attachShadow = function attachShadow(init: ShadowRootInit): ShadowRoot {
    const root = originalAttachShadow.call(this, init);

    if (this.localName !== 'mintlify-assistant') {
      return root;
    }

    hideTriggerInShadow(root);

    const observer = new MutationObserver(() => {
      hideTriggerInShadow(root);
    });
    observer.observe(root, { childList: true });

    return root;
  };
}
