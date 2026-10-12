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
  claimUrl?: string;
}): HumanVerificationEmailContent {
  const who = reachLine(params.sender);
  const inviteeName = params.inviteeName?.trim();
  const greetingText = inviteeName ? `Hi ${inviteeName},` : 'Hi,';
  const greetingHtml = inviteeName ? `Hi ${escapeHtml(inviteeName)},` : 'Hi,';
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
    `<tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.4;color:rgba(238,229,216,0.7);padding-bottom:8px;">${greetingHtml}</td></tr>`,
    '<tr><td style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:15px;line-height:1.4;color:rgba(238,229,216,0.7);padding-bottom:28px;">',
    `${who.html}. Confirm this address belongs to you:`,
    '</td></tr>',
    '<tr><td align="center" style="padding-bottom:28px;">',
    `<a href="${verifyUrl}" style="display:inline-block;background:#ff5c30;color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">Verify this email</a>`,
    '</td></tr>',
    params.claimUrl ? claimSectionHtml(params.claimUrl) : '',
    '<tr><td style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.5;color:rgba(238,229,216,0.45);">',
    `This link expires ${escapeHtml(expiresLabel)}. If you didn't expect this, you can ignore it.`,
    '</td></tr>',
    '</table></td></tr></table>',
    '</body></html>',
  ].join('');

  const text = [
    greetingText.replace(/,$/, ''),
    '',
    `${who.text}.`,
    '',
    `Verify this email: ${params.verifyUrl}`,
    '',
    ...(params.claimUrl ? claimSectionText(params.claimUrl) : []),
    `This link expires ${expiresLabel}. If you didn't expect this, you can ignore it.`,
  ].join('\n');

  return { subject, html, text };
}

const CLAIM_PERKS = [
  'Keep your agents, channels, and contacts',
  'Let your agents email the people you invite',
  'Lift the five-message demo cap',
];

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace';

function claimSectionHtml(claimUrl: string): string {
  const href = escapeHtml(claimUrl);
  const perks = CLAIM_PERKS.map(
    (perk) =>
      '<tr>' +
      `<td width="20" valign="top" style="font-family:${MONO};font-size:13px;line-height:1.6;color:#ff5c30;">+</td>` +
      `<td style="font-family:${SANS};font-size:14px;line-height:1.6;color:rgba(238,229,216,0.75);">${escapeHtml(perk)}</td>` +
      '</tr>'
  ).join('');

  return [
    '<tr><td style="padding-bottom:28px;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#12110f;border:1px solid #2e2b27;border-radius:10px;">',
    '<tr><td style="padding:24px 24px 0;">',
    `<span style="display:inline-block;font-family:${MONO};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#ff5c30;border:1px solid rgba(255,92,48,0.4);border-radius:999px;padding:3px 10px;">Free demo</span>`,
    '</td></tr>',
    '<tr><td style="padding:16px 24px 8px;font-family:Georgia,\'Times New Roman\',serif;font-size:24px;line-height:1.2;letter-spacing:-0.03em;color:#eee5d8;">',
    'Make this setup <span style="color:#ff5c30;font-style:italic;">yours</span>',
    '</td></tr>',
    `<tr><td style="padding:0 24px 16px;font-family:${SANS};font-size:14px;line-height:1.5;color:rgba(238,229,216,0.6);">`,
    'It runs in a temporary workspace. Claim it for free to:',
    '</td></tr>',
    '<tr><td style="padding:0 24px 20px;">',
    `<table role="presentation" cellspacing="0" cellpadding="0">${perks}</table>`,
    '</td></tr>',
    '<tr><td style="padding:0 24px 24px;">',
    `<a href="${href}" style="display:inline-block;background:transparent;color:#eee5d8;font-family:${SANS};font-size:14px;font-weight:600;text-decoration:none;padding:11px 20px;border:1px solid #eee5d8;border-radius:6px;">Claim this setup &rarr;</a>`,
    '</td></tr>',
    '</table>',
    '</td></tr>',
  ].join('');
}

function claimSectionText(claimUrl: string): string[] {
  return [
    'Make this setup yours. It runs in a temporary workspace. Claim it for free to:',
    ...CLAIM_PERKS.map((perk) => `+ ${perk}`),
    '',
    `Claim this setup: ${claimUrl}`,
    '',
  ];
}

function formatExpiry(expiresAt: string): string {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return 'soon';
  }

  return date.toUTCString();
}
