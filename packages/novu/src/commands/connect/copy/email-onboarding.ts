export const SEND_FROM_ACCOUNT_LABEL = 'Send from your Novu account email:';

export function formatSendFromMailtoHint(sendFromEmail: string): string {
  return `\n\n(Send this from your Novu account email: ${sendFromEmail})`;
}
