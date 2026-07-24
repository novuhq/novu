import { randomBytes } from 'node:crypto';
import { chmod, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Machine-readable handoff lines for `--ci` / logging mode. Agents grep stdout for these. */
const HANDOFF_PREFIX = 'NOVU_CONNECT_';

/**
 * Persist the dashboard auth URL in a short-lived temp file so `--ci` stdout
 * never logs the `device_code` query param (a bearer-like poll secret).
 *
 * POSIX mode bits may not map cleanly to Windows ACLs; callers should delete
 * the file once the auth handoff completes.
 */
export async function writeAuthUrlHandoffFile(authUrl: string): Promise<string> {
  const filePath = join(tmpdir(), `novu-connect-auth-url-${randomBytes(6).toString('hex')}.txt`);
  await writeFile(filePath, authUrl, { encoding: 'utf8' });
  await chmod(filePath, 0o600);

  return filePath;
}

export function logAuthUrlFileHandoffEvent(opts: { authUrlFile: string }): void {
  console.log(`${HANDOFF_PREFIX}AUTH_URL_FILE=${opts.authUrlFile}`);
}

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

export function logSlackConfigTokenSavedHandoffEvent(): void {
  console.log(`${HANDOFF_PREFIX}SLACK_CONFIG_TOKEN_SAVED=1`);
}

export function logTelegramDeepLinkHandoffEvents(opts: { deepLinkUrl: string; botUsername: string }): void {
  console.log(`${HANDOFF_PREFIX}TELEGRAM_DEEPLINK_URL=${opts.deepLinkUrl}`);
  console.log(`${HANDOFF_PREFIX}TELEGRAM_BOT_USERNAME=${opts.botUsername}`);
}

export function logTelegramDeepLinkQrPngHandoffEvent(opts: { deepLinkQrPngPath: string }): void {
  console.log(`${HANDOFF_PREFIX}TELEGRAM_DEEPLINK_QR_PNG=${opts.deepLinkQrPngPath}`);
}

export function logWhatsAppSignupHandoffEvent(opts: { signupUrl: string }): void {
  console.log(`${HANDOFF_PREFIX}WHATSAPP_SIGNUP_URL=${opts.signupUrl}`);
}

export function logWhatsAppTestHandoffEvents(opts: { waMeUrl?: string; displayPhoneNumber?: string }): void {
  if (opts.waMeUrl) {
    console.log(`${HANDOFF_PREFIX}WHATSAPP_WA_ME_URL=${opts.waMeUrl}`);
  }
  if (opts.displayPhoneNumber) {
    console.log(`${HANDOFF_PREFIX}WHATSAPP_PHONE_NUMBER=${opts.displayPhoneNumber}`);
  }
}

export function logWhatsAppWaMeQrPngHandoffEvent(opts: { waMeQrPngPath: string }): void {
  console.log(`${HANDOFF_PREFIX}WHATSAPP_WA_ME_QR_PNG=${opts.waMeQrPngPath}`);
}

export function logSendblueDashboardHandoffEvent(opts: { dashboardUrl: string }): void {
  console.log(`${HANDOFF_PREFIX}SENDBLUE_DASHBOARD_URL=${opts.dashboardUrl}`);
}

export function logSendblueWebhookHandoffEvents(opts: { callbackUrl: string; webhookSecret?: string }): void {
  console.log(`${HANDOFF_PREFIX}SENDBLUE_WEBHOOK_CALLBACK_URL=${opts.callbackUrl}`);
  if (opts.webhookSecret) {
    console.log(`${HANDOFF_PREFIX}SENDBLUE_WEBHOOK_SECRET=${opts.webhookSecret}`);
  }
}

export function logSendblueImessageHandoffEvents(opts: { imessageUrl: string; fromNumber: string }): void {
  console.log(`${HANDOFF_PREFIX}SENDBLUE_IMESSAGE_URL=${opts.imessageUrl}`);
  console.log(`${HANDOFF_PREFIX}SENDBLUE_FROM_NUMBER=${opts.fromNumber}`);
}
