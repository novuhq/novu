import { Body, Controller, Get, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PinoLogger } from '@novu/application-generic';
import { Response } from 'express';
import { AgentEmailActionTokenService } from './services/agent-email-action-token.service';
import { ChatSdkService } from './services/chat-sdk.service';

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
        renderErrorPage('Invalid link', 'This action link is missing or malformed.')
      );

      return;
    }

    const claims = await this.tokenService.peekActionToken(token);
    if (!claims) {
      this.sendHtml(
        res,
        HttpStatus.OK,
        renderErrorPage(
          'Link expired',
          'This action link is no longer valid. It may have expired or already been used.'
        )
      );

      return;
    }

    this.sendHtml(
      res,
      HttpStatus.OK,
      renderConfirmPage({
        label: claims.label || claims.actionId,
        token,
        executeUrl: EXECUTE_PATH,
      })
    );
  }

  @Post('/execute')
  async execute(@Body('t') token: string | undefined, @Res() res: Response): Promise<void> {
    if (!token) {
      this.sendHtml(res, HttpStatus.BAD_REQUEST, renderErrorPage('Invalid request', 'Missing action token.'));

      return;
    }

    // Atomic single-use claim: consume returns the entry exactly once across all concurrent
    // callers (Redis GETDEL). Any other click — prefetcher, refresh, second tab — receives
    // null and is shown the "already submitted" page.
    const consumed = await this.tokenService.consumeActionToken(token);
    if (!consumed) {
      this.sendHtml(res, HttpStatus.OK, renderAlreadySubmittedPage());

      return;
    }

    const { claims } = consumed;

    try {
      await this.chatSdkService.processEmailAction(claims);
    } catch (err) {
      this.logger.error(err, `Failed to process agent email action ${claims.actionId} for agent ${claims.agentId}`);
      // Re-store the entry so the user can retry from the same email link instead of seeing
      // "Already submitted". The remaining TTL is preserved against the original `expiresAt`
      // so a token can never outlive its natural 3-day expiry.
      await this.tokenService.releaseActionToken(token, consumed).catch((releaseErr) => {
        this.logger.warn(releaseErr, `Failed to release agent email action token after dispatch error`);
      });
      this.sendHtml(
        res,
        HttpStatus.OK,
        renderErrorPage(
          'Something went wrong',
          'We could not submit this action. Please try again from the email, or contact your agent operator.'
        )
      );

      return;
    }

    this.sendHtml(res, HttpStatus.OK, renderSuccessPage({ label: claims.label || claims.actionId }));
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

function escapeHtml(value: string): string {
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
    border-radius: 12px;
    padding: 40px 32px;
    width: 100%;
    max-width: 440px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06);
    text-align: center;
    animation: fadeIn 240ms ease-out both;
  }
  h1 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
  p { margin: 0 0 24px; color: #52525b; font-size: 14px; line-height: 1.5; }
  .label {
    display: inline-block;
    margin-bottom: 24px;
    padding: 8px 14px;
    background: #f4f4f5;
    border-radius: 6px;
    color: #18181b;
    font-weight: 500;
    font-size: 14px;
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  button.primary {
    appearance: none;
    border: 0;
    cursor: pointer;
    background: #18181b;
    color: #ffffff;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    width: 100%;
    transition: background 120ms ease;
  }
  button.primary:hover { background: #27272a; }
  .footer { margin-top: 20px; font-size: 12px; color: #a1a1aa; }
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
    display: flex;
    align-items: center;
    justify-content: center;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes stroke { to { stroke-dashoffset: 0; } }
`;

function pageShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<meta name="referrer" content="no-referrer" />
<title>${escapeHtml(title)}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>${body}</body>
</html>`;
}

function renderConfirmPage(params: { label: string; token: string; executeUrl: string }): string {
  const body = `
<div class="card">
  <h1>Confirm action</h1>
  <p>You're about to submit the following action to the agent. This cannot be undone.</p>
  <div class="label">${escapeHtml(params.label)}</div>
  <form method="POST" action="${escapeHtml(params.executeUrl)}" autocomplete="off">
    <input type="hidden" name="t" value="${escapeHtml(params.token)}" />
    <button type="submit" class="primary">Confirm ${escapeHtml(params.label)}</button>
  </form>
  <div class="footer">Sent by your Novu agent</div>
</div>`;

  return pageShell(`Confirm: ${params.label}`, body);
}

function renderSuccessPage(params: { label: string }): string {
  const body = `
<div class="card">
  <div class="check">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
  </div>
  <h1>Action submitted</h1>
  <p>Your agent received <strong>${escapeHtml(params.label)}</strong> and is processing it.</p>
  <div class="footer">You can close this tab.</div>
</div>`;

  return pageShell('Action submitted', body);
}

function renderAlreadySubmittedPage(): string {
  const body = `
<div class="card">
  <div class="info-icon" aria-hidden="true">✓</div>
  <h1>Already submitted</h1>
  <p>This action has already been received. You can close this tab.</p>
</div>`;

  return pageShell('Already submitted', body);
}

function renderErrorPage(title: string, message: string): string {
  const body = `
<div class="card">
  <div class="info-icon" aria-hidden="true">!</div>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(message)}</p>
</div>`;

  return pageShell(title, body);
}
