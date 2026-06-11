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

export function logTelegramBotfatherHandoffEvent(opts: { botfatherUrl: string }): void {
  console.log(`${HANDOFF_PREFIX}TELEGRAM_BOTFATHER_URL=${opts.botfatherUrl}`);
}

export function logTelegramSetupLinkHandoffEvent(opts: { setupUrl: string }): void {
  console.log(`${HANDOFF_PREFIX}TELEGRAM_SETUP_URL=${opts.setupUrl}`);
}

export function logTelegramSetupLinkQrPngHandoffEvent(opts: { setupQrPngPath: string }): void {
  console.log(`${HANDOFF_PREFIX}TELEGRAM_SETUP_QR_PNG=${opts.setupQrPngPath}`);
}

export function logSlackSetupLinkHandoffEvent(opts: { setupUrl: string }): void {
  console.log(`${HANDOFF_PREFIX}SLACK_SETUP_URL=${opts.setupUrl}`);
}

export function logTelegramDeepLinkHandoffEvents(opts: { deepLinkUrl: string; botUsername: string }): void {
  console.log(`${HANDOFF_PREFIX}TELEGRAM_DEEPLINK_URL=${opts.deepLinkUrl}`);
  console.log(`${HANDOFF_PREFIX}TELEGRAM_BOT_USERNAME=${opts.botUsername}`);
}

export function logTelegramDeepLinkQrPngHandoffEvent(opts: { deepLinkQrPngPath: string }): void {
  console.log(`${HANDOFF_PREFIX}TELEGRAM_DEEPLINK_QR_PNG=${opts.deepLinkQrPngPath}`);
}
