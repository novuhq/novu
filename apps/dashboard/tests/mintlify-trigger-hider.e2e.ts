import { expect, test } from '@playwright/test';
import { installMintlifyTriggerHider, MINTLIFY_TRIGGER_HIDE_STYLE_ID } from '../src/utils/mintlify-trigger-hider';

test('hides the Mintlify launcher inside its shadow root only', async ({ page }) => {
  expect(installMintlifyTriggerHider.toString()).toContain(MINTLIFY_TRIGGER_HIDE_STYLE_ID);

  await page.addInitScript(installMintlifyTriggerHider);
  await page.goto('about:blank');

  const result = await page.evaluate(async (styleId) => {
    const openHost = document.createElement('div');
    const openRoot = openHost.attachShadow({ mode: 'open' });
    const openParagraph = document.createElement('p');
    openParagraph.textContent = 'plain';
    openRoot.appendChild(openParagraph);

    const closedHost = document.createElement('section');
    const closedRoot = closedHost.attachShadow({ mode: 'closed' });

    const widget = document.createElement('mintlify-assistant');
    document.body.append(openHost, closedHost, widget);
    const widgetRoot = widget.attachShadow({ mode: 'closed' });

    const trigger = document.createElement('button');
    trigger.setAttribute('data-mintlify-assistant-trigger', '');
    trigger.textContent = 'Ask assistant';

    const panel = document.createElement('section');
    panel.setAttribute('data-mintlify-assistant-panel', '');
    panel.textContent = 'Ask AI';
    widgetRoot.append(trigger, panel);

    widgetRoot.getElementById(styleId)?.remove();
    await Promise.resolve();

    const restoredStyle = widgetRoot.getElementById(styleId);
    const triggerStyle = getComputedStyle(trigger);
    const panelStyle = getComputedStyle(panel);

    return {
      openRootIsHostRoot: openHost.shadowRoot === openRoot,
      openRootHasHideStyle: openRoot.getElementById(styleId) !== null,
      openText: openRoot.textContent,
      closedShadowRoot: closedHost.shadowRoot,
      closedRootHasHideStyle: closedRoot.getElementById(styleId) !== null,
      widgetShadowRoot: widget.shadowRoot,
      styleCount: widgetRoot.querySelectorAll('style').length,
      restoredStyle: restoredStyle?.textContent ?? '',
      triggerDisplay: triggerStyle.display,
      triggerVisibility: triggerStyle.visibility,
      triggerPointerEvents: triggerStyle.pointerEvents,
      panelDisplay: panelStyle.display,
      panelVisibility: panelStyle.visibility,
      panelText: panel.textContent,
    };
  }, MINTLIFY_TRIGGER_HIDE_STYLE_ID);

  expect(result.openRootIsHostRoot).toBe(true);
  expect(result.openRootHasHideStyle).toBe(false);
  expect(result.openText).toBe('plain');
  expect(result.closedShadowRoot).toBeNull();
  expect(result.closedRootHasHideStyle).toBe(false);
  expect(result.widgetShadowRoot).toBeNull();
  expect(result.styleCount).toBe(1);
  expect(result.restoredStyle).toContain('[data-mintlify-assistant-trigger]');
  expect(result.triggerDisplay).toBe('none');
  expect(result.triggerVisibility).toBe('hidden');
  expect(result.triggerPointerEvents).toBe('none');
  expect(result.panelDisplay).toBe('block');
  expect(result.panelVisibility).toBe('visible');
  expect(result.panelText).toBe('Ask AI');
});
