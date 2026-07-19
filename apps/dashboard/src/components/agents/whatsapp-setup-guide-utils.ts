import { getAgentApiBaseUrl } from '@/config';

export const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;

export function buildAgentWebhookUrl(agentId: string, integrationIdentifier: string): string {
  return `${getAgentApiBaseUrl()}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
}

export function buildWhatsAppDeepLink(displayPhoneNumber: string): string {
  const digits = displayPhoneNumber.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent('Hi')}`;
}
