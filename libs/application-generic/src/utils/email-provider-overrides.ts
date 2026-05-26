export type NovuEmailSenderOverride = {
  from?: string;
  senderName?: string;
};

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Resolves Novu trigger override sender fields (`from` address + `senderName`) from
 * provider override payloads. Supports string `from` or provider-native `from` objects.
 */
export function resolveNovuEmailSenderFields(overrides?: Record<string, unknown>): NovuEmailSenderOverride {
  if (!overrides) {
    return {};
  }

  const rawFrom = overrides.from;
  const overrideSenderName = readString(overrides.senderName);

  if (typeof rawFrom === 'string') {
    return {
      from: readString(rawFrom),
      senderName: overrideSenderName,
    };
  }

  if (!rawFrom || typeof rawFrom !== 'object' || Array.isArray(rawFrom)) {
    return { senderName: overrideSenderName };
  }

  const fromObject = rawFrom as Record<string, unknown>;

  const from =
    readString(fromObject.email) ?? readString(fromObject.address) ?? readString(fromObject.Email);
  const senderName =
    overrideSenderName ?? readString(fromObject.name) ?? readString(fromObject.Name);

  return { from, senderName };
}

/**
 * Removes Novu-specific sender fields from provider passthrough data so they are applied
 * via `IEmailOptions` (`from` + `senderName`) instead of overwriting provider-native `from`.
 */
export function omitNovuSenderFieldsFromEmailProviderPassthrough(
  passthrough: Record<string, unknown>
): Record<string, unknown> {
  const { senderName: _senderName, from, ...rest } = passthrough;

  if (typeof from === 'string') {
    return rest;
  }

  return passthrough;
}
