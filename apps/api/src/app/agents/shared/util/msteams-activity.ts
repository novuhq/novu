/**
 * Extracts the Azure AD tenant id from an inbound MS Teams Bot Framework Activity.
 *
 * For multi-tenant distribution this is the tenant the messaging user belongs to (a customer
 * tenant, which may differ from the bot's home tenant). Returns `undefined` when the payload is
 * not a Teams activity or the tenant is absent.
 */
export function extractMsTeamsTenantId(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const activity = raw as {
    conversation?: { tenantId?: unknown };
    channelData?: { tenant?: { id?: unknown } };
  };

  const fromConversation = activity.conversation?.tenantId;
  if (typeof fromConversation === 'string' && fromConversation.length > 0) {
    return fromConversation;
  }

  const fromChannelData = activity.channelData?.tenant?.id;
  if (typeof fromChannelData === 'string' && fromChannelData.length > 0) {
    return fromChannelData;
  }

  return undefined;
}
