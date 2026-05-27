import { Body, Controller, Get, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PinoLogger } from '@novu/application-generic';
import { Response } from 'express';
import {
  AgentEmailActionCacheUnavailableError,
  AgentEmailActionClaims,
  AgentEmailActionStyle,
  AgentEmailActionTokenService,
  ConsumedActionToken,
  PeekedActionToken,
} from './services/agent-email-action-token.service';
import { captureAgentException, captureAgentWarning } from './utils/capture-agent-sentry';
import { AgentActionPreDispatchError, ChatSdkService } from './services/chat-sdk.service';

const EXECUTE_PATH = '/v1/agents/email/actions/execute';

/**
 * Public, unauthenticated endpoints that handle clicks from `<Button>` action elements
 * rendered inside agent-sent emails. The click flow is intentionally two-step to defeat
 * URL-prefetchers in email clients (Outlook Safe Links, Mimecast, etc.):
 *
 *   GET  /v1/agents/email/actions/preview?t=<token>  — peek (read-only), render confirm HTML.
 *                                                      Does NOT mutate any state, so a
 *                                                      prefetcher's GET can't burn the token.
 *   POST /v1/agents/email/actions/execute            — atomic single-use consume, dispatch
 *                                                      to chat SDK's processAction, render
 *                                                      animated success HTML. Re-stores the
 *                                                      token on transient dispatch failure.
 *
 * The URL carries only an opaque random token — the action context (agent/environment/org
 * IDs, recipient address, action id/value) lives server-side in Redis so it never ends up
 * in third-party email scanner logs, browser history, or proxy access logs.
 *
 * The execute endpoint serves two clients: the form-submit path (browsers without JS) and
 * an XHR path the inline JS uses to swap the card in place without a full reload. The XHR
 * path is keyed on `X-Requested-With: XMLHttpRequest`; both return the same HTML bodies.
 */
@Controller('/agents/email/actions')
@ApiExcludeController()
export class AgentEmailActionsController {
  constructor(
    private readonly tokenService: AgentEmailActionTokenService,
    private readonly chatSdkService: ChatSdkService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @Get('/preview')
  async preview(@Query('t') token: string | undefined, @Res() res: Response): Promise<void> {
    if (!token) {
      this.sendHtml(
        res,
        HttpStatus.BAD_REQUEST,
        renderErrorPage({ title: 'Invalid link', message: 'This action link is missing or malformed.' })
      );

      return;
    }

    let peeked: PeekedActionToken | null;
    try {
      peeked = await this.tokenService.peekActionToken(token);
    } catch (err) {
      if (err instanceof AgentEmailActionCacheUnavailableError) {
        this.logger.warn(err, 'Cache unavailable while peeking agent email action token');
        captureAgentWarning(err, { component: 'agent-email-actions', operation: 'peek-action-token' });
        this.sendHtml(res, HttpStatus.SERVICE_UNAVAILABLE, renderTryAgainPage());

        return;
      }
      throw err;
    }

    if (!peeked) {
      this.sendHtml(
        res,
        HttpStatus.OK,
        renderErrorPage({
          title: 'Link expired',
          message: 'This action link is no longer valid. It may have expired or already been used.',
        })
      );

      return;
    }

    this.sendHtml(
      res,
      HttpStatus.OK,
      renderConfirmPage({
        claims: peeked.claims,
        mintedAt: peeked.mintedAt,
        token,
        executeUrl: EXECUTE_PATH,
      })
    );
  }

  @Post('/execute')
  async execute(@Body('t') token: string | undefined, @Res() res: Response): Promise<void> {
    if (!token) {
      this.sendHtml(
        res,
        HttpStatus.BAD_REQUEST,
        renderErrorPage({ title: 'Invalid request', message: 'Missing action token.' })
      );

      return;
    }

    // Atomic single-use claim: consume returns the entry exactly once across all concurrent
    // callers (Redis GETDEL). Any other click — prefetcher, refresh, second tab — receives
    // null and is shown the "already submitted" page. A *cache* failure is distinct from a
    // null result and surfaces as a typed error so we don't silently drop valid clicks.
    let consumed: ConsumedActionToken | null;
    try {
      consumed = await this.tokenService.consumeActionToken(token);
    } catch (err) {
      if (err instanceof AgentEmailActionCacheUnavailableError) {
        this.logger.warn(err, 'Cache unavailable while consuming agent email action token');
        captureAgentWarning(err, { component: 'agent-email-actions', operation: 'consume-action-token' });
        this.sendHtml(res, HttpStatus.SERVICE_UNAVAILABLE, renderTryAgainPage());

        return;
      }
      throw err;
    }

    if (!consumed) {
      this.sendHtml(res, HttpStatus.OK, renderAlreadySubmittedPage());

      return;
    }

    const { claims } = consumed;

    try {
      await this.chatSdkService.processEmailAction(claims);
    } catch (err) {
      this.logger.error(err, `Failed to process agent email action ${claims.actionId} for agent ${claims.agentId}`);
      captureAgentException(err, {
        component: 'agent-email-actions',
        operation: 'process-email-action',
        agentId: claims.agentId,
        integrationIdentifier: claims.integrationIdentifier,
        extra: { actionId: claims.actionId, preDispatch: err instanceof AgentActionPreDispatchError },
      });

      // Only re-release the token when the failure is provably *pre-dispatch* (token
      // validation, config resolution, adapter setup) — at which point no user-facing side
      // effects have run and a retry is safe. For any other error, the agent's onAction
      // handler may have executed partial work; replaying the token would let that
      // non-idempotent work run twice, so the user is shown a terminal error and must
      // recover via a fresh email if needed.
      if (err instanceof AgentActionPreDispatchError) {
        await this.tokenService.releaseActionToken(token, consumed).catch((releaseErr) => {
          this.logger.warn(releaseErr, `Failed to release agent email action token after pre-dispatch failure`);
          captureAgentWarning(releaseErr, {
            component: 'agent-email-actions',
            operation: 'release-action-token',
            agentId: claims.agentId,
          });
        });
      }

      this.sendHtml(
        res,
        HttpStatus.OK,
        renderErrorPage({
          title: 'Something went wrong',
          message: 'We could not submit this action. Please try again from the email, or contact your agent operator.',
        })
      );

      return;
    }

    this.sendHtml(res, HttpStatus.OK, renderSuccessPage({ claims }));
  }

  private sendHtml(res: Response, status: HttpStatus, body: string): void {
    res
      .status(status)
      .setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      .setHeader('Pragma', 'no-cache')
      .setHeader('Expires', '0')
      .type('text/html; charset=utf-8')
      .send(body);
  }
}

// ===========================================================================================
// HTML rendering helpers
// ===========================================================================================

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Generates 1–2 letter initials from an agent name. Falls back to `?` for empty input. */
function computeInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = words
    .map((w) => Array.from(w)[0] ?? '')
    .join('')
    .toUpperCase();

  return initials || (trimmed[0] ?? '?').toUpperCase();
}

/** Deterministic light-mode background/foreground pair chosen from a small palette. The same
 *  seed always returns the same pair so an agent's avatar is stable across emails. */
function avatarPalette(seed: string): { bgLight: string; fgLight: string; bgDark: string; fgDark: string } {
  const palette = [
    { bgLight: '#fef3c7', fgLight: '#92400e', bgDark: '#451a03', fgDark: '#fcd34d' }, // amber
    { bgLight: '#dbeafe', fgLight: '#1e40af', bgDark: '#172554', fgDark: '#93c5fd' }, // blue
    { bgLight: '#dcfce7', fgLight: '#166534', bgDark: '#052e16', fgDark: '#86efac' }, // green
    { bgLight: '#fce7f3', fgLight: '#9d174d', bgDark: '#500724', fgDark: '#f9a8d4' }, // pink
    { bgLight: '#ede9fe', fgLight: '#5b21b6', bgDark: '#2e1065', fgDark: '#c4b5fd' }, // violet
    { bgLight: '#fef9c3', fgLight: '#854d0e', bgDark: '#422006', fgDark: '#fde047' }, // yellow
    { bgLight: '#cffafe', fgLight: '#155e75', bgDark: '#083344', fgDark: '#67e8f9' }, // cyan
    { bgLight: '#ffe4e6', fgLight: '#9f1239', bgDark: '#4c0519', fgDark: '#fda4af' }, // rose
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;

  return palette[Math.abs(hash) % palette.length] as (typeof palette)[number];
}

function formatRelativeSent(mintedAt: number): string {
  const secondsAgo = Math.max(0, Math.floor(Date.now() / 1000) - mintedAt);
  if (secondsAgo < 60) return 'just now';
  if (secondsAgo < 3600) {
    const m = Math.floor(secondsAgo / 60);

    return `${m} min ago`;
  }
  if (secondsAgo < 86400) {
    const h = Math.floor(secondsAgo / 3600);

    return `${h}h ago`;
  }
  const d = Math.floor(secondsAgo / 86400);

  return `${d}d ago`;
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
  .avatar {
    width: 56px;
    height: 56px;
    margin: 0 auto 14px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 18px;
    letter-spacing: -0.2px;
    background: var(--avatar-bg, #f4f4f5);
    color: var(--avatar-fg, #52525b);
  }
  .agent-name {
    font-size: 13px;
    color: #71717a;
    margin: 0 0 6px;
    font-weight: 500;
  }
  h1.action-headline {
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.3;
    color: #18181b;
    overflow-wrap: anywhere;
  }
  h1.message-heading { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
  p.intro { margin: 0 0 24px; color: #52525b; font-size: 14px; line-height: 1.5; }
  p.danger-warning {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 24px;
    padding: 8px 12px;
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
  }
  p.danger-warning::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #dc2626;
  }
  button.primary {
    appearance: none;
    border: 0;
    cursor: pointer;
    background: #18181b;
    color: #ffffff;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    width: 100%;
    transition: background 120ms ease, transform 120ms ease, opacity 200ms ease;
  }
  button.primary:hover { background: #27272a; }
  button.primary:active { transform: translateY(1px); }
  button.primary:disabled {
    opacity: 0.7;
    cursor: progress;
    background: #18181b;
  }
  button.primary.danger { background: #dc2626; }
  button.primary.danger:hover { background: #b91c1c; }
  button.primary .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    margin-right: 8px;
    vertical-align: -2px;
    animation: spin 700ms linear infinite;
  }
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
    background: #f4f4f5;
    color: #52525b;
    font-size: 28px;
    font-weight: 500;
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
  .cancel-hint.visible { display: block; }
  .card.swapping { animation: none; opacity: 0; transform: translateY(4px); transition: opacity 200ms ease, transform 200ms ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes stroke { to { stroke-dashoffset: 0; } }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (prefers-color-scheme: dark) {
    body { background: #0a0a0a; color: #fafafa; }
    .card { background: #18181b; border-color: #27272a; box-shadow: 0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.4); }
    .avatar { background: var(--avatar-bg-dark, #27272a); color: var(--avatar-fg-dark, #d4d4d8); }
    .agent-name { color: #a1a1aa; }
    h1.action-headline, h1.message-heading { color: #fafafa; }
    p.intro { color: #a1a1aa; }
    p.danger-warning { background: #450a0a; color: #fca5a5; border-color: #7f1d1d; }
    p.danger-warning::before { background: #f87171; }
    button.primary { background: #fafafa; color: #18181b; }
    button.primary:hover { background: #e4e4e7; }
    button.primary:disabled { background: #fafafa; }
    button.primary.danger { background: #dc2626; color: #ffffff; }
    button.primary.danger:hover { background: #b91c1c; }
    button.primary .spinner { border-color: rgba(0,0,0,0.25); border-top-color: #18181b; }
    button.primary.danger .spinner { border-color: rgba(255,255,255,0.3); border-top-color: #ffffff; }
    a.secondary, button.secondary { color: #a1a1aa; }
    a.secondary:hover, button.secondary:hover { color: #fafafa; background: #27272a; }
    .footer { color: #71717a; border-top-color: #27272a; }
    .check { background: #052e16; }
    .check svg path { stroke: #34d399; }
    .info-icon { background: #27272a; color: #a1a1aa; }
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

function renderAvatar(agentName: string): string {
  const initials = computeInitials(agentName);
  const palette = avatarPalette(agentName);
  const style = `--avatar-bg:${palette.bgLight};--avatar-fg:${palette.fgLight};--avatar-bg-dark:${palette.bgDark};--avatar-fg-dark:${palette.fgDark};`;

  return `<div class="avatar" style="${style}" aria-hidden="true">${escapeHtml(initials)}</div>`;
}

function renderFooter(agentName: string, mintedAt: number): string {
  return `<div class="footer">Sent ${escapeHtml(formatRelativeSent(mintedAt))} by ${escapeHtml(agentName)}</div>`;
}

function buttonStyleClass(style: AgentEmailActionStyle | undefined): string {
  return style === 'danger' ? 'primary danger' : 'primary';
}

interface ConfirmPageParams {
  claims: AgentEmailActionClaims;
  mintedAt: number;
  token: string;
  executeUrl: string;
}

function renderConfirmPage(params: ConfirmPageParams): string {
  const { claims, mintedAt, token, executeUrl } = params;
  const label = claims.label || claims.actionId;
  const isDanger = claims.style === 'danger';
  const danger = isDanger ? `<p class="danger-warning">This action cannot be undone.</p>` : '';

  const body = `
<div class="card" data-state="confirm">
  ${renderAvatar(claims.agentName)}
  <p class="agent-name">${escapeHtml(claims.agentName)}</p>
  <h1 class="action-headline">${escapeHtml(label)}</h1>
  ${danger}
  <form id="agent-action-form" method="POST" action="${escapeHtml(executeUrl)}" autocomplete="off">
    <input type="hidden" name="t" value="${escapeHtml(token)}" />
    <button type="submit" class="${buttonStyleClass(claims.style)}" data-submit-label="Confirm" data-busy-label="Submitting…">
      <span class="label">Confirm</span>
    </button>
    <div>
      <button type="button" class="secondary" id="cancel-btn">Cancel</button>
      <div class="cancel-hint" id="cancel-hint">Close this tab to cancel — no action will be taken.</div>
    </div>
  </form>
  ${renderFooter(claims.agentName, mintedAt)}
</div>`;

  return pageShell(`Confirm: ${label}`, body, CONFIRM_PAGE_SCRIPT);
}

/** Inlined on every confirm page. Adds:
 *   1. Submit-button loading state (disables + spinner, prevents double-submit).
 *   2. fetch()-based submit so the success card swaps in place without a full reload.
 *   3. "Cancel" button that attempts window.close() and falls back to a hint.
 *  Falls back gracefully when JS is disabled — the plain form POST still works.
 */
const CONFIRM_PAGE_SCRIPT = `
(function () {
  var form = document.getElementById('agent-action-form');
  var cancelBtn = document.getElementById('cancel-btn');
  var cancelHint = document.getElementById('cancel-hint');
  if (!form) return;

  var submitBtn = form.querySelector('button[type="submit"]');
  var labelSpan = submitBtn ? submitBtn.querySelector('.label') : null;

  function setBusy() {
    if (!submitBtn) return;
    submitBtn.disabled = true;
    if (labelSpan) {
      labelSpan.innerHTML = '<span class="spinner" aria-hidden="true"></span>' + (submitBtn.getAttribute('data-busy-label') || 'Submitting…');
    }
  }

  function swapCard(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var newCard = doc.querySelector('.card');
    if (!newCard) { window.location.reload(); return; }

    var current = document.querySelector('.card');
    if (!current) { document.body.appendChild(newCard); return; }

    current.classList.add('swapping');
    setTimeout(function () {
      current.replaceWith(newCard);
    }, 200);
  }

  form.addEventListener('submit', function (e) {
    if (!window.fetch) return; // graceful fallback to plain form POST
    e.preventDefault();
    setBusy();

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'text/html' },
      credentials: 'same-origin',
    })
      .then(function (r) { return r.text(); })
      .then(swapCard)
      .catch(function () {
        // Network failure — fall back to a hard reload so the server can render an error page.
        form.submit();
      });
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
      // window.close() works only on tabs opened by script. Attempt it; if the tab is still
      // here a moment later, surface a hint instead.
      window.close();
      setTimeout(function () {
        if (!document.hidden && cancelHint) cancelHint.classList.add('visible');
      }, 150);
    });
  }
})();
`;

interface SuccessPageParams {
  claims: AgentEmailActionClaims;
}

function renderSuccessPage(params: SuccessPageParams): string {
  const { claims } = params;
  const label = claims.label || claims.actionId;

  // Inline onclick on the close link so it works in both the full-page-load path AND the
  // XHR-swap path (scripts inserted via DOMParser/replaceWith don't auto-execute, but inline
  // event handler attributes are honored).
  const body = `
<div class="card" data-state="success">
  <div class="check">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
  </div>
  <h1 class="message-heading">Action submitted</h1>
  <p class="intro"><strong>${escapeHtml(claims.agentName)}</strong> received <strong>${escapeHtml(label)}</strong> and is processing it.</p>
  <a class="secondary" href="javascript:void(0)" onclick="try{window.close();}catch(e){}setTimeout(function(){if(!document.hidden){var h=this&&this.nextElementSibling;if(h)h.classList.add('visible');}}.bind(this),150);return false;">← Close this tab</a>
  <div class="cancel-hint">You can close this tab manually.</div>
</div>`;

  return pageShell('Action submitted', body);
}

function renderAlreadySubmittedPage(): string {
  const body = `
<div class="card" data-state="already-submitted">
  <div class="info-icon" aria-hidden="true">✓</div>
  <h1 class="message-heading">Already submitted</h1>
  <p class="intro">This action has already been received. You can close this tab.</p>
</div>`;

  return pageShell('Already submitted', body);
}

/** Rendered when the action-token cache is unreachable (Redis outage). Distinct from the
 *  "Already submitted" terminal page — the token is *not* consumed, so the user can refresh
 *  this page once service is restored and the link will still work. */
function renderTryAgainPage(): string {
  const body = `
<div class="card" data-state="try-again">
  <div class="info-icon" aria-hidden="true">↻</div>
  <h1 class="message-heading">We're having trouble right now</h1>
  <p class="intro">Please try again in a moment. Your action link is still valid — no need to come back to the email.</p>
  <a class="secondary" href="javascript:void(0)" onclick="location.reload();return false;">Try again</a>
</div>`;

  return pageShell("We're having trouble right now", body);
}

function renderErrorPage(params: { title: string; message: string }): string {
  const body = `
<div class="card" data-state="error">
  <div class="info-icon" aria-hidden="true">!</div>
  <h1 class="message-heading">${escapeHtml(params.title)}</h1>
  <p class="intro">${escapeHtml(params.message)}</p>
</div>`;

  return pageShell(params.title, body);
}
