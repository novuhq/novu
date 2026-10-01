import { DEFAULT_HUMAN_RELAY_NAME, type RelaySender } from '../services/relay-owner-name';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function strong(text: string): string {
  return `<strong style="color:#eee5d8;font-weight:500;">${escapeHtml(text)}</strong>`;
}

/** "Nikita Grossman wants to reach you via agent Deploy bot". */
function reachLine(sender: RelaySender): { text: string; html: string } {
  const operator = sender.operatorName?.trim() || 'Someone';
  const agent = sender.agentName?.trim() || DEFAULT_HUMAN_RELAY_NAME;
  const text = `${operator} wants to reach you via agent ${agent}`;

  return { text, html: `${strong(operator)} wants to reach you via agent ${strong(agent)}` };
}

export type HumanVerificationEmailContent = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Builds the double-opt-in verification email. Styled with gethuman.md tokens
 * (black / cream / orange) and no Novu watermark — this is Human branding only.
 *
 * `sender` carries the agent's own name (absent while it still has the
 * placeholder name) and the operator who ran `human setup`, so the recipient
 * knows whose agent is writing.
 */
export function buildHumanVerificationEmail(params: {
  sender: RelaySender;
  inviteeName?: string;
  verifyUrl: string;
  expiresAt: string;
}): HumanVerificationEmailContent {
  const who = reachLine(params.sender);
  const greeting = params.inviteeName?.trim() ? `Hi ${escapeHtml(params.inviteeName.trim())},` : 'Hi,';
  const expiresLabel = formatExpiry(params.expiresAt);
  const verifyUrl = escapeHtml(params.verifyUrl);

  const subject = who.text;

  const html = [
    '<!DOCTYPE html><html><head><meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
    '</head>',
    '<body style="margin:0;padding:0;background:#000000;color:#eee5d8;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#000000;">',
    '<tr><td align="center" style="padding:40px 16px;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#000000;">',
    '<tr><td style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;letter-spacing:0.02em;color:rgba(238,229,216,0.5);padding-bottom:12px;">',
    'human',
    '</td></tr>',
    '<tr><td style="font-family:Georgia,\'Times New Roman\',serif;font-size:32px;line-height:1.15;letter-spacing:-0.04em;color:#eee5d8;padding-bottom:16px;">',
    'Verify your <span style="color:#ff5c30;font-style:italic;">email</span>',
    '</td></tr>',
    `<tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.4;color:rgba(238,229,216,0.7);padding-bottom:8px;">${greeting}</td></tr>`,
    '<tr><td style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:15px;line-height:1.4;color:rgba(238,229,216,0.7);padding-bottom:28px;">',
    `${who.html}. Confirm this address belongs to you:`,
    '</td></tr>',
    '<tr><td align="center" style="padding-bottom:28px;">',
    `<a href="${verifyUrl}" style="display:inline-block;background:#ff5c30;color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">Verify this email</a>`,
    '</td></tr>',
    '<tr><td style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.5;color:rgba(238,229,216,0.45);">',
    `This link expires ${escapeHtml(expiresLabel)}. If you didn't expect this, you can ignore it.`,
    '</td></tr>',
    '</table></td></tr></table>',
    '</body></html>',
  ].join('');

  const text = [
    greeting.replace(/,$/, ''),
    '',
    `${who.text}.`,
    '',
    `Verify this email: ${params.verifyUrl}`,
    '',
    `This link expires ${expiresLabel}. If you didn't expect this, you can ignore it.`,
  ].join('\n');

  return { subject, html, text };
}

function formatExpiry(expiresAt: string): string {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return 'soon';
  }

  return date.toUTCString();
}
