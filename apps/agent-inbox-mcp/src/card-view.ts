import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ShownCard } from './card';
import type { HostId } from './connections';

/**
 * The view ChatGPT and Claude draw `agent_card`'s result in (an MCP Apps view): the agent's card as a picture, with
 * its link to open and its address. Versioned in its address, so a host that keeps views never shows an old one.
 */
export const CARD_VIEW_URI = 'ui://agent-inbox/agent-card-v1.html';

/** What MCP Apps calls an HTML view. */
export const CARD_VIEW_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * The hosts that draw the view. Every other one gets the card as text alone: Claude Code and Codex would hand their
 * model the card's data in place of its text, and Cursor would draw a view nobody asked it for.
 */
export function showsCardView(host: HostId | null): boolean {
  return host === 'chatgpt' || host === 'claude';
}

/** What the view draws, as the tool's `structuredContent`. */
export type CardViewData = {
  name: string;
  address?: string;
  /** The public card, which the view opens. Missing while only the agent's contacts can reach it. */
  url?: string;
  /** The card as a picture (the dashboard's `/p/{handle}/card-image`). Missing without a public card. */
  imageUrl?: string;
};

export function cardViewData(card: ShownCard): CardViewData {
  return {
    name: card.name,
    ...(card.address ? { address: card.address } : {}),
    ...(card.url ? { url: card.url, imageUrl: `${card.url}/card-image` } : {}),
  };
}

/** The tool's `_meta` for the hosts that draw the view: MCP Apps' own key, and the one ChatGPT reads. */
export function cardViewToolMeta(): Record<string, unknown> {
  return { ui: { resourceUri: CARD_VIEW_URI }, 'openai/outputTemplate': CARD_VIEW_URI };
}

/**
 * Offers the view, and says where it may load the card's picture from: the dashboard, at the address the API is on
 * (`https://www.agentinbox.md/api`), and at that address without `www.` or with it, which the other redirects to.
 */
export function registerCardView(server: McpServer, apiUrl: string | null): void {
  const domains = pictureDomainsOf(apiUrl);

  server.registerResource(
    'agent_card_view',
    CARD_VIEW_URI,
    {
      title: 'Agent card',
      description: 'The agent’s card, as agent_card shows it.',
      mimeType: CARD_VIEW_MIME_TYPE,
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: CARD_VIEW_MIME_TYPE,
          text: CARD_VIEW_HTML,
          _meta: {
            ui: { csp: { resourceDomains: domains, connectDomains: [] }, prefersBorder: false },
            'openai/widgetCSP': { resource_domains: domains, connect_domains: [] },
            'openai/widgetDescription': 'The agent’s card: its name, its email address and the link to its card.',
            'openai/widgetPrefersBorder': false,
          },
        },
      ],
    })
  );
}

export function pictureDomainsOf(apiUrl: string | null): string[] {
  if (!apiUrl) {
    return [];
  }

  const { protocol, host } = new URL(apiUrl);
  const bare = host.replace(/^www\./, '');

  return [`${protocol}//${bare}`, `${protocol}//www.${bare}`];
}

/**
 * The view itself: no script or style from anywhere else. It asks the host for the tool's result over MCP Apps'
 * `ui/*` messages (or reads it from `window.openai` in ChatGPT), draws the card's picture with "Open card" and the
 * address under it, tells the host how tall it is, and opens the card's link through the host.
 */
export const CARD_VIEW_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agent card</title>
<style>
  :root { color-scheme: light dark; --text: #1a1714; --muted: #6b645b; --line: rgba(26, 23, 20, 0.12); }
  :root[data-theme="dark"] { --text: #ebe2d6; --muted: #8f887d; --line: rgba(235, 226, 214, 0.14); }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: transparent; }
  body { font: 14px/20px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--text); }
  main { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; padding: 4px 2px 8px; }
  .card { display: block; width: 300px; max-width: 100%; height: auto; border-radius: 18px; }
  .plain { width: 300px; max-width: 100%; padding: 20px; border-radius: 18px; background: #110f0e; border: 1px solid #2e2b27; color: #d8e7ea; }
  .plain .label { font: 500 9px/12px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.72px; }
  .plain .name { margin-top: 24px; font: italic 38px/42px "Instrument Serif", Georgia, serif; }
  .plain .address { margin-top: 12px; font: 11px/14px ui-monospace, SFMono-Regular, Menlo, monospace; color: #c4bcb0; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
  .open { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 7px; border: 0; background: #ff5c30; color: #0a0908; font: 500 12px/16px inherit; font-family: inherit; cursor: pointer; }
  .address { font: 12px/16px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); user-select: all; }
</style>
</head>
<body>
<main id="root" aria-live="polite"></main>
<script>
(() => {
  const root = document.getElementById('root');
  const pending = new Map();
  let nextId = 1;
  let shown = null;

  const post = (message) => window.parent.postMessage(Object.assign({ jsonrpc: '2.0' }, message), '*');
  const notify = (method, params) => post({ method, params: params || {} });
  const request = (method, params) =>
    new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      post({ id, method, params: params || {} });
    });

  const theme = (value) => {
    if (value === 'light' || value === 'dark') document.documentElement.dataset.theme = value;
  };

  const reportSize = () => {
    const box = document.documentElement.getBoundingClientRect();
    notify('ui/notifications/size-changed', { width: Math.ceil(box.width), height: Math.ceil(box.height) });
  };

  const open = (url) => {
    if (window.openai && typeof window.openai.openExternal === 'function') {
      window.openai.openExternal({ href: url });
    } else {
      request('ui/open-link', { url });
    }
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const render = (card) => {
    if (!card || typeof card.name !== 'string') return;
    const key = JSON.stringify(card);
    if (key === shown) return;
    shown = key;
    root.replaceChildren();

    if (card.imageUrl) {
      const picture = el('img', 'card');
      picture.alt = card.name + '’s agent card' + (card.address ? ': ' + card.address : '');
      picture.width = 300;
      picture.height = 460;
      picture.src = card.imageUrl;
      picture.addEventListener('load', reportSize);
      root.append(picture);
    } else {
      const plain = el('div', 'plain');
      plain.append(el('div', 'label', 'AGENT CARD'), el('div', 'name', card.name));
      if (card.address) plain.append(el('div', 'address', card.address));
      root.append(plain);
    }

    const row = el('div', 'row');
    if (card.url) {
      const button = el('button', 'open', 'Open card ↗');
      button.type = 'button';
      button.addEventListener('click', () => open(card.url));
      row.append(button);
    }
    if (card.address) row.append(el('span', 'address', card.address));
    if (row.childNodes.length) root.append(row);
    reportSize();
  };

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || message.jsonrpc !== '2.0') return;
    if (message.id !== undefined && pending.has(message.id)) {
      pending.get(message.id)(message.result);
      pending.delete(message.id);
      return;
    }
    if (message.method === 'ui/notifications/tool-result') render(message.params && message.params.structuredContent);
    if (message.method === 'ui/notifications/host-context-changed') theme(message.params && message.params.theme);
  });

  const fromOpenAi = () => {
    if (!window.openai) return;
    theme(window.openai.theme);
    render(window.openai.toolOutput);
  };
  window.addEventListener('openai:set_globals', fromOpenAi);
  fromOpenAi();

  request('ui/initialize', {
    protocolVersion: '2026-01-26',
    appInfo: { name: 'agentinbox-card', version: '1.0.0' },
    appCapabilities: {},
  }).then((result) => {
    theme(result && result.hostContext && result.hostContext.theme);
    notify('ui/notifications/initialized');
  });

  new ResizeObserver(reportSize).observe(document.body);
})();
</script>
</body>
</html>
`;
