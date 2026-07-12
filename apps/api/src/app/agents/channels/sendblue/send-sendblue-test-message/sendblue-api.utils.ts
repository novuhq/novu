import { safeOutboundJsonRequest } from '@novu/application-generic';

const SENDBLUE_SEND_MESSAGE_URL = 'https://api.sendblue.co/api/send-message';
const SENDBLUE_API_TIMEOUT_MS = 10_000;

export type SendblueSendMessageResponse = {
  message_handle?: string;
  status?: 'QUEUED' | 'SENT' | 'DELIVERED' | 'ERROR';
  error_code?: number;
  error_message?: string;
};

export interface SendSendblueMessageArgs {
  apiKey: string;
  secretKey: string;
  fromNumber: string;
  to: string;
  content: string;
}

/**
 * Sends a plain-text message via the Sendblue REST API. Unlike WhatsApp, Sendblue
 * has no pre-approved-template requirement, so a direct text send is sufficient
 * for the agent onboarding "test connection" flow.
 * @see https://docs.sendblue.com/getting-started/send-message/
 */
export async function sendSendblueMessage(args: SendSendblueMessageArgs): Promise<{
  body: SendblueSendMessageResponse;
  statusCode: number;
}> {
  const response = await safeOutboundJsonRequest<SendblueSendMessageResponse>({
    url: SENDBLUE_SEND_MESSAGE_URL,
    method: 'POST',
    timeoutMs: SENDBLUE_API_TIMEOUT_MS,
    headers: {
      'sb-api-key-id': args.apiKey,
      'sb-api-secret-key': args.secretKey,
    },
    body: {
      number: args.to,
      from_number: args.fromNumber,
      content: args.content,
    },
  });

  return { body: response.body, statusCode: response.statusCode };
}
