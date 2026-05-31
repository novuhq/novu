/**
 * Shared, self-contained HTML renderer for the terminal page shown after a user
 * completes (or fails) an OAuth/Connect flow in a browser tab that was opened by
 * another app (e.g. the agent MCP OAuth flow, or the React `Connect` button).
 *
 * The design intentionally mirrors the agent email action-button landing pages
 * (`agent-email-actions.controller.ts`): a centered card, system font stack,
 * light/dark via `prefers-color-scheme`, and an animated success check. The copy
 * tells the user the flow is finished, the tab can be closed, and they can return
 * to wherever they started.
 *
 * These are pure functions with no DI so any controller/use-case can render the
 * same page without wiring.
 */

export type ConnectionResultStatus = 'success' | 'error';

export interface ConnectionResultPageOptions {
  status: ConnectionResultStatus;
  /** `<title>` text. */
  title: string;
  /** Main `<h1>` heading. */
  heading: string;
  /** Supporting paragraph under the heading. */
  message: string;
  /** Optional small footer note (e.g. "You can now return to where you started."). */
  footerNote?: string;
  /**
   * When provided, a best-effort `window.opener?.postMessage(payload, '*')` is
   * emitted so a same-origin opener can auto-detect the outcome. Cross-origin
   * openers that pin `event.origin` will ignore it — it is a convenience, never
   * relied upon (the canonical flows use polling / popup-close detection).
   */
  postMessagePayload?: Record<string, unknown>;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PAGE_STYLES = `
  *,*::before,*::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: #f7f7f8;
    color: #18181b;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    -webkit-font-smoothing: antialiased;
  }
  .card {
    background: #ffffff;
    border: 1px solid #e4e4e7;
    border-radius: 16px;
    padding: 32px;
    width: 100%;
    max-width: 440px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
    text-align: center;
    animation: fadeIn 240ms ease-out both;
  }
  h1.message-heading { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #18181b; }
  p.intro { margin: 0 0 8px; color: #52525b; font-size: 14px; line-height: 1.5; }
  a.secondary,
  button.secondary {
    appearance: none;
    border: 0;
    background: transparent;
    cursor: pointer;
    color: #71717a;
    font-size: 13px;
    font-weight: 500;
    margin-top: 14px;
    padding: 4px 8px;
    text-decoration: none;
    display: inline-block;
    border-radius: 6px;
    transition: color 120ms ease, background 120ms ease;
    font-family: inherit;
  }
  a.secondary:hover, button.secondary:hover { color: #18181b; background: #f4f4f5; }
  .footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #f4f4f5;
    font-size: 12px;
    color: #a1a1aa;
  }
  .check {
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    border-radius: 50%;
    background: #ecfdf5;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pop 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .check svg { width: 32px; height: 32px; }
  .check svg path {
    stroke: #059669;
    stroke-width: 3;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 48;
    stroke-dashoffset: 48;
    animation: stroke 420ms 200ms ease-out forwards;
  }
  .info-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    border-radius: 50%;
    background: #fef2f2;
    color: #b91c1c;
    font-size: 28px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cancel-hint {
    display: none;
    margin-top: 12px;
    font-size: 12px;
    color: #71717a;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes stroke { to { stroke-dashoffset: 0; } }

  @media (prefers-color-scheme: dark) {
    body { background: #0a0a0a; color: #fafafa; }
    .card { background: #18181b; border-color: #27272a; box-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.4); }
    h1.message-heading { color: #fafafa; }
    p.intro { color: #a1a1aa; }
    a.secondary, button.secondary { color: #a1a1aa; }
    a.secondary:hover, button.secondary:hover { color: #fafafa; background: #27272a; }
    .footer { color: #71717a; border-top-color: #27272a; }
    .check { background: #052e16; }
    .check svg path { stroke: #34d399; }
    .info-icon { background: #450a0a; color: #fca5a5; }
    .cancel-hint { color: #a1a1aa; }
  }
`;

function pageShell(title: string, body: string, inlineScript?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<meta name="referrer" content="no-referrer" />
<meta name="color-scheme" content="light dark" />
<title>${escapeHtml(title)}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>${body}${inlineScript ? `<script>${inlineScript}</script>` : ''}</body>
</html>`;
}

const SUCCESS_ICON = `<div class="check">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
  </div>`;

const ERROR_ICON = `<div class="info-icon" aria-hidden="true">!</div>`;

/**
 * Inline close-tab link. `window.close()` only works on tabs opened by script, so
 * we attempt it and, if the tab is still here a moment later, reveal a manual hint.
 * The handler is inlined so it works even when the markup is injected without
 * executing `<script>` blocks.
 */
const CLOSE_LINK = `<a class="secondary" href="javascript:void(0)" onclick="try{window.close();}catch(e){}var h=this.nextElementSibling;setTimeout(function(){if(!document.hidden&&h){h.style.display='block';}},150);return false;">Close this tab</a>
  <div class="cancel-hint">You can close this tab manually.</div>`;

/**
 * Embeds a postMessage call for same-origin openers (e.g. MCP OAuth popup).
 *
 * Security: `JSON.stringify` is not enough inside `<script>` — the HTML parser
 * still recognizes `</script>` inside string literals and closes the block early.
 * MCP error payloads include `reason` from OAuth `error_description`, which is
 * provider-controlled. We replace `<` with `\u003c` in the serialized JSON so
 * the tokenizer never sees a breakout sequence; JS decodes it identically at runtime.
 */
function buildPostMessageScript(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');

  return `try{if(window.opener){window.opener.postMessage(${json},'*');}}catch(e){}`;
}

export function renderConnectionResultPage(options: ConnectionResultPageOptions): string {
  const { status, title, heading, message, footerNote, postMessagePayload } = options;
  const icon = status === 'success' ? SUCCESS_ICON : ERROR_ICON;
  const footer = footerNote ? `<div class="footer">${escapeHtml(footerNote)}</div>` : '';

  const body = `
<div class="card" data-state="${status}">
  ${icon}
  <h1 class="message-heading">${escapeHtml(heading)}</h1>
  <p class="intro">${escapeHtml(message)}</p>
  ${CLOSE_LINK}
  ${footer}
</div>`;

  const inlineScript = postMessagePayload ? buildPostMessageScript(postMessagePayload) : undefined;

  return pageShell(title, body, inlineScript);
}
