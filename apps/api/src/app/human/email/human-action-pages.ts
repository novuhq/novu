import { createHash } from 'node:crypto';
import { resolveHumanDashboardBaseUrl } from '../../shared/helpers/resolve-human-dashboard-base-url';
import type { RelaySender } from '../services/relay-owner-name';
import {
  agentAtStart,
  agentSubline,
  COLORS,
  escapeHtml,
  type HumanEmailRecipient,
  type HumanEmailSender,
} from './human-email-layout';

export type HumanActionOutcome = 'approved' | 'denied' | 'picked' | 'answered';

const CLOSE_TAB = 'Close this tab and go do human things.';

/** The design's check comes from a fallback font, so every device would draw another one. This is its shape. */
const CHECK_MARK = `<svg viewBox="0 0 36 36" width="36" height="36" fill="currentColor"><path d="M23.4 12.1 L21.6 12.1 Q19.6 13.4 17.9 15.8 Q16.4 17.8 15.2 20.2 Q14.8 20.9 14.5 20.8 Q14.3 19.4 13.9 19.1 Q13.4 18.8 11.9 19.7 L13.3 24 Q14.2 24.1 15 23.9 Q16.6 21.4 18.8 17.8 Q20.9 14.9 23.4 12.1 Z" /></svg>`;

const INFO_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>`;

const PAGE_STYLES = `
  *,*::before,*::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 32px 16px;
    background: ${COLORS.canvas};
    color: ${COLORS.ink};
    font-family: Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 24px;
    -webkit-font-smoothing: antialiased;
  }
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 18px;
    width: 100%;
    max-width: 416px;
    padding: 32px;
    border: 1px solid ${COLORS.border};
    border-radius: 16px;
    background: ${COLORS.card};
    animation: rise 240ms ease-out both;
  }
  .card.leaving { opacity: 0; transform: translateY(4px); transition: opacity 200ms ease, transform 200ms ease; }
  .logo { display: flex; align-items: center; gap: 8px; color: ${COLORS.ink}; text-decoration: none; }
  .logo svg { display: block; width: 18px; height: 18px; }
  .wordmark { font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 17px; }
  .wordmark span { color: ${COLORS.accent}; }
  .sender { display: flex; align-items: center; gap: 12px; }
  .sender img { display: block; width: 40px; height: 40px; border-radius: 50%; background: ${COLORS.ink}; object-fit: cover; }
  .sender p { margin: 0; }
  .name { font-size: 15px; line-height: 20px; font-weight: 500; }
  .meta { margin-top: 2px; font-size: 13px; line-height: 17px; color: ${COLORS.muted}; }
  h1 { margin: 0; font-size: 22px; line-height: 27.5px; font-weight: 500; letter-spacing: -0.33px; overflow-wrap: anywhere; }
  .text { margin: 0; color: ${COLORS.text}; }
  .note { margin: 0; font-size: 13px; line-height: 17px; color: ${COLORS.muted}; }
  .note.warning { color: #D0312D; }
  .buttons { display: flex; align-items: flex-start; gap: 8px; }
  button {
    flex: 1 1 0;
    min-width: 0;
    appearance: none;
    padding: 11px 18px;
    border: 0;
    border-radius: 8px;
    font: inherit;
    font-size: 15px;
    line-height: 20px;
    font-weight: 500;
    overflow-wrap: anywhere;
    cursor: pointer;
    transition: background-color 120ms ease, opacity 200ms ease;
  }
  button.primary { background: ${COLORS.ink}; color: #FFFFFF; }
  button.primary:hover { background: #2E2A26; }
  button.primary:disabled { opacity: 0.7; cursor: progress; }
  button.secondary { border: 1px solid ${COLORS.border}; background: ${COLORS.card}; color: ${COLORS.ink}; }
  button.secondary:hover { background: ${COLORS.box}; }
  button.secondary:disabled { opacity: 0.5; background: ${COLORS.card}; cursor: default; }
  .spinner {
    display: inline-block;
    width: 13px;
    height: 13px;
    margin-right: 8px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #FFFFFF;
    border-radius: 50%;
    vertical-align: -2px;
    animation: spin 700ms linear infinite;
  }
  .cancel-banner {
    position: absolute;
    top: calc(100% + 13px);
    left: -1px;
    right: -1px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid #D0E1FF;
    border-radius: 8px;
    background: #EFF5FF;
    color: ${COLORS.ink};
    font-size: 13px;
    line-height: 17px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px);
    transition: opacity 200ms ease, transform 200ms ease, visibility 200ms;
  }
  .cancel-banner.visible { opacity: 1; visibility: visible; transform: translateY(0); }
  .cancel-banner svg { flex: none; margin-top: 0.5px; color: #3B82FF; }
  .cancel-close { opacity: 0; transition: opacity 200ms ease; }
  .cancel-close.visible { opacity: 1; }
  .badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    font-size: 16px;
    line-height: 21px;
    font-weight: 500;
  }
  .badge.success { background: #E8F8EE; color: #1B9955; animation: pop 360ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  .badge.neutral { background: ${COLORS.box}; color: ${COLORS.muted}; }
  @keyframes rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pop { 0% { opacity: 0; transform: scale(0.6); } 60% { opacity: 1; transform: scale(1.06); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (max-width: 440px) {
    body { padding: 16px 12px; }
    .card { padding: 24px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .card, .badge.success { animation: none; }
    .card.leaving, .cancel-banner, .cancel-close, button { transition: none; }
  }
`;

/**
 * Inlined on the confirmation page. The answer goes out without leaving the page, and the next card fades in where
 * this one was. Posted as a plain form, which the API reads; the browser's own form post stays as the fallback.
 */
const CONFIRM_PAGE_SCRIPT = `
(function () {
  var form = document.getElementById('answer-form');
  var cancel = document.getElementById('cancel-button');
  var banner = document.getElementById('cancel-banner');
  var closeHint = document.getElementById('cancel-close');
  var closing;
  if (!form) return;

  var submit = form.querySelector('button[type="submit"]');

  function setBusy() {
    submit.disabled = true;
    cancel.disabled = true;
    submit.insertAdjacentHTML('afterbegin', '<span class="spinner" aria-hidden="true"></span>');
  }

  function swapCard(html) {
    var next = new DOMParser().parseFromString(html, 'text/html').querySelector('.card');
    if (!next) { window.location.reload(); return; }

    var current = document.querySelector('.card');
    current.classList.add('leaving');
    setTimeout(function () {
      current.replaceWith(next);
    }, 200);
  }

  form.addEventListener('submit', function (event) {
    clearTimeout(closing);
    banner.classList.remove('visible');
    if (!window.fetch || !window.URLSearchParams) return;
    event.preventDefault();
    setBusy();

    fetch(window.location.href, {
      method: 'POST',
      body: new URLSearchParams(new FormData(form)),
      headers: { Accept: 'text/html' },
      credentials: 'same-origin',
    })
      .then(function (response) { return response.text(); })
      .then(swapCard)
      .catch(function () { form.submit(); });
  });

  cancel.addEventListener('click', function () {
    banner.classList.add('visible');
    clearTimeout(closing);
    // Long enough to read the banner. A tab can only close itself when this is the one page in its history, so one
    // that stays open says what to do.
    closing = setTimeout(function () {
      window.close();
      setTimeout(function () {
        closeHint.classList.add('visible');
      }, 150);
    }, 3000);
  });
})();
`;

/**
 * Stands in for the API's default policy, which blocks inline scripts. Only the script above runs, by its hash, so an
 * agent's words on the page never can. Images may come from another host: the logo and the orb load from the site,
 * which isn't always the host showing the page.
 */
export const HUMAN_ACTION_PAGE_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' https: data:",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' https: data:",
  "object-src 'none'",
  `script-src 'sha256-${createHash('sha256').update(CONFIRM_PAGE_SCRIPT).digest('base64')}'`,
  "script-src-attr 'none'",
  "style-src 'self' https: 'unsafe-inline'",
].join(';');

function siteUrl(path: string): string {
  return `${resolveHumanDashboardBaseUrl()}${path}`;
}

function pageShell(title: string, card: string, script?: string): string {
  const fonts = `
  @font-face { font-family: Geist; font-weight: 100 900; font-display: swap; src: url(${siteUrl('/fonts/geist-latin.woff2')}) format('woff2'); }
  @font-face { font-family: 'Geist Mono'; font-weight: 400; font-display: swap; src: url(${siteUrl('/fonts/geist-mono-regular.woff2')}) format('woff2'); }`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<meta name="referrer" content="no-referrer" />
<meta name="color-scheme" content="light only" />
<title>${escapeHtml(title)}</title>
<style>${fonts}${PAGE_STYLES}</style>
</head>
<body>${card}${script ? `<script>${script}</script>` : ''}</body>
</html>`;
}

function logo(): string {
  return `<a class="logo" href="${siteUrl('')}" aria-label="agentinbox.md">
    <svg aria-hidden="true" viewBox="0 0 22 22" fill="none">
      <path fill="${COLORS.accent}" d="M21.083 0c.506 0 .917.41.917.917v13.291c0 .506-.41.917-.917.917h-9.88c-.118 0-.203-.112-.203-.23v-2.978A.917.917 0 0 0 10.083 11H7.104c-.117 0-.229-.085-.229-.202V.917c0-.506.41-.917.917-.917h13.291Z" />
      <path fill="#5C5650" d="M6.188 14.896c0 .506.41.917.916.917h1.604c.506 0 .917.41.917.916v4.354c0 .506-.41.917-.917.917H.917A.917.917 0 0 1 0 21.083v-7.791c0-.506.41-.917.917-.917h4.354c.506 0 .916.41.916.917v1.604Z" />
    </svg>
    <span class="wordmark">agentinbox<span>.md</span></span>
  </a>`;
}

function statusCard(badge: { glyph: string; tone: 'success' | 'neutral' }, title: string, text: string): string {
  return `<main class="card">
  ${logo()}
  <div class="badge ${badge.tone}" aria-hidden="true">${badge.glyph}</div>
  <h1>${escapeHtml(title)}</h1>
  <p class="text">${escapeHtml(text)}</p>
</main>`;
}

function askedAgo(mintedAt: number): string {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - mintedAt);

  if (seconds < 60) {
    return 'just now';
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min ago`;
  }

  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  return `${Math.floor(seconds / 86400)}d ago`;
}

export function renderHumanConfirmPage(params: {
  sender: HumanEmailSender;
  recipient: HumanEmailRecipient;
  question: string;
  buttonLabel: string;
  danger: boolean;
  mintedAt: number;
  token: string;
}): string {
  const { sender, recipient, question, buttonLabel, danger, mintedAt, token } = params;
  const agent = agentAtStart(sender);

  const card = `<main class="card">
  ${logo()}
  <div class="sender">
    <img src="${escapeHtml(sender.pictureUrl)}" alt="" width="40" height="40" />
    <div>
      <p class="name">${escapeHtml(agent)}</p>
      <p class="meta">${escapeHtml(agentSubline(sender))}</p>
    </div>
  </div>
  <h1>${escapeHtml(question)}</h1>
  <p class="note">${escapeHtml(`${agent} asked ${recipient.name ?? 'you'} ${askedAgo(mintedAt)}. It’s waiting, patiently.`)}</p>
  ${danger ? '<p class="note warning">This can’t be undone.</p>' : ''}
  <form id="answer-form" class="buttons" method="POST" autocomplete="off">
    <input type="hidden" name="t" value="${escapeHtml(token)}" />
    <button type="submit" class="primary">${escapeHtml(buttonLabel)}</button>
    <button type="button" class="secondary" id="cancel-button">Cancel</button>
  </form>
  <p class="note">${escapeHtml(`${agent} gets your answer right away. No meeting required.`)}</p>
  <p class="note">Link scanners click everything. This step makes sure the answer is yours.</p>
  <div class="cancel-banner" id="cancel-banner">${INFO_ICON}<span>Nothing was sent. <span class="cancel-close" id="cancel-close">You can close this tab.</span></span></div>
</main>`;

  return pageShell('Confirm your answer', card, CONFIRM_PAGE_SCRIPT);
}

export function renderHumanDonePage(params: {
  sender: RelaySender;
  outcome: HumanActionOutcome;
  choice?: string;
}): string {
  const { sender, outcome, choice } = params;
  const agent = agentAtStart(sender);
  const copy: Record<HumanActionOutcome, { title: string; text: string }> = {
    approved: { title: 'Approved', text: `${agent} is on it and will tell you when it’s done. ${CLOSE_TAB}` },
    denied: { title: 'Denied', text: `${agent} won’t go ahead. ${CLOSE_TAB}` },
    picked: { title: 'Picked', text: `${agent} will go with ${choice}. ${CLOSE_TAB}` },
    answered: { title: 'Sent', text: `${agent} has your answer. ${CLOSE_TAB}` },
  };
  const { title, text } = copy[outcome];

  return pageShell(title, statusCard({ glyph: CHECK_MARK, tone: 'success' }, title, text));
}

export function renderHumanLinkUsedPage(sender?: RelaySender): string {
  const title = 'This link already did its job';
  const where = sender?.agentName ? `${sender.agentName}’s email` : 'the email';
  const text = `Each button works once. Someone already answered, or it expired. If something looks off, reply to ${where}.`;

  return pageShell(title, statusCard({ glyph: '–', tone: 'neutral' }, title, text));
}

export function renderHumanTryAgainPage(): string {
  const title = 'Give it a moment';
  const text = 'We’re having trouble right now. Your link still works, so try it again shortly.';

  return pageShell(title, statusCard({ glyph: '–', tone: 'neutral' }, title, text));
}

export function renderHumanFailedPage(): string {
  const title = 'That didn’t go through';
  const text = 'Your answer didn’t reach the agent. Try the button in the email again.';

  return pageShell(title, statusCard({ glyph: '–', tone: 'neutral' }, title, text));
}
