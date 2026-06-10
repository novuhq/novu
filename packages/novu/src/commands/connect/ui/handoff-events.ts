/** Machine-readable handoff lines for `--ci` / logging mode. Agents grep stdout for these. */
const HANDOFF_PREFIX = 'NOVU_CONNECT_';

export function logEmailHandoffEvents(opts: {
  inboundAddress: string;
  mailtoUrl: string;
  sendFromEmail?: string;
}): void {
  console.log(`${HANDOFF_PREFIX}INBOUND_ADDRESS=${opts.inboundAddress}`);
  console.log(`${HANDOFF_PREFIX}MAILTO=${opts.mailtoUrl}`);
  if (opts.sendFromEmail) {
    console.log(`${HANDOFF_PREFIX}SEND_FROM_EMAIL=${opts.sendFromEmail}`);
  }
}

export function logSlackHandoffEvents(opts: { authorizeUrl: string }): void {
  console.log(`${HANDOFF_PREFIX}SLACK_AUTHORIZE_URL=${opts.authorizeUrl}`);
}
