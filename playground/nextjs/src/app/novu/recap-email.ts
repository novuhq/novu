export interface RecapMessage {
  readonly role: string;
  readonly content: string;
  readonly sentAt: string;
}

interface RecapEmail {
  readonly heading: string;
  readonly buttonLabel: string;
  readonly buttonUrl: string;
  readonly messages: ReadonlyArray<RecapMessage>;
}

// Message text comes from chat users, so it must not become markup.
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function messageRow({ role, content, sentAt }: RecapMessage): string {
  // History roles are the API's sender types (subscriber, agent, platform_user, system), not model roles.
  const fromAgent = role === 'agent';
  const time = new Date(sentAt).toISOString().slice(11, 16);

  return `
    <tr>
      <td style="padding: 0 0 12px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background-color: ${fromAgent ? '#f4f1ff' : '#f5f6f8'}; border-left: 3px solid ${fromAgent ? '#6c47ff' : '#c4c9d4'}; border-radius: 6px; padding: 12px 16px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280;">
                <strong style="color: #111827;">${fromAgent ? 'Agent' : 'You'}</strong> · ${time} UTC
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #111827; white-space: pre-wrap;">${escapeHtml(content)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function recapEmail({ heading, buttonLabel, buttonUrl, messages }: RecapEmail): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #eef0f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #eef0f4;">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="background-color: #6c47ff; padding: 24px 32px;">
                <p style="margin: 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #e4dcff;">Conversation recap</p>
                <h1 style="margin: 4px 0 0 0; font-size: 22px; line-height: 28px; color: #ffffff;">${escapeHtml(heading)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 32px 12px 32px;">
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #374151;">${messages.length} messages, oldest first.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${messages.map(messageRow).join('')}
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 8px 32px 32px 32px;">
                <a href="${escapeHtml(buttonUrl)}" style="display: inline-block; background-color: #6c47ff; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">${escapeHtml(buttonLabel)}</a>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #6b7280;">Sent by the custom-code agent because you asked for a recap.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
