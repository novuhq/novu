function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace';
const SERIF = "Georgia,'Times New Roman',serif";

export type HumanTestEmailContent = {
  subject: string;
  html: string;
  text: string;
};

/**
 * The onboarding test, in the same Human mail as the verification email: black, cream, orange,
 * a serif headline and a mono mark. No Novu watermark.
 */
export function buildHumanTestEmail(params: { agentName: string }): HumanTestEmailContent {
  const name = params.agentName.trim() || 'your agent';
  const escapedName = escapeHtml(name);
  const subject = `Hi, I’m ${name}`;

  const html = [
    '<!DOCTYPE html><html><head><meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
    '</head>',
    '<body style="margin:0;padding:0;background:#000000;color:#eee5d8;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#000000;">',
    '<tr><td align="center" style="padding:40px 16px;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#000000;">',
    `<tr><td style="font-family:${MONO};font-size:13px;letter-spacing:0.02em;color:rgba(238,229,216,0.5);padding-bottom:12px;">`,
    'human',
    '</td></tr>',
    `<tr><td style="font-family:${SERIF};font-size:32px;line-height:1.15;letter-spacing:-0.04em;color:#eee5d8;padding-bottom:16px;">`,
    `Hi, I’m <span style="color:#ff5c30;font-style:italic;">${escapedName}</span>`,
    '</td></tr>',
    `<tr><td style="font-family:${SANS};font-size:15px;line-height:1.5;color:rgba(238,229,216,0.7);padding-bottom:28px;">`,
    'Reply to this email. Your reply lands in my inbox.',
    '</td></tr>',
    `<tr><td style="font-family:${MONO};font-size:12px;line-height:1.5;color:rgba(238,229,216,0.45);">`,
    'This is the test from your onboarding. A reply is all it takes.',
    '</td></tr>',
    '</table></td></tr></table>',
    '</body></html>',
  ].join('');

  const text = [
    subject,
    '',
    'Reply to this email. Your reply lands in my inbox.',
    '',
    'This is the test from your onboarding. A reply is all it takes.',
  ].join('\n');

  return { subject, html, text };
}
