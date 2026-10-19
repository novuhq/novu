export type SenderFieldKey = 'name' | 'email' | 'replyTo';

export type SenderFieldLinkState = {
  nameLinked: boolean;
  emailLinked: boolean;
  replyToLinked: boolean;
};

/** Schema hydration turns unset strings into `''`, so treat empty like undefined. */
function isUnset(value?: string): boolean {
  return value === undefined || value.trim() === '';
}

export function isValidSenderEmail(email: string): boolean {
  if (!email) {
    return true;
  }

  if (/\{\{.*?\}\}/.test(email)) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function deriveUseProviderDefaults({
  hasAgent,
  useProviderDefaults,
  fromEmail,
  fromName,
}: {
  hasAgent: boolean;
  useProviderDefaults?: boolean;
  fromEmail?: string;
  fromName?: string;
}): boolean {
  if (useProviderDefaults === true) {
    return true;
  }

  if (hasAgent) {
    return false;
  }

  return isUnset(fromEmail) && isUnset(fromName);
}

export function deriveFieldLinkState({
  hasAgent,
  useProviderDefaults,
  fromEmail,
  fromName,
  replyTo,
}: {
  hasAgent: boolean;
  useProviderDefaults: boolean;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
}): SenderFieldLinkState {
  if (!hasAgent) {
    return {
      nameLinked: false,
      emailLinked: false,
      replyToLinked: false,
    };
  }

  return {
    nameLinked: !useProviderDefaults && isUnset(fromName),
    emailLinked: !useProviderDefaults && isUnset(fromEmail),
    replyToLinked: isUnset(replyTo),
  };
}

export type SenderConfigSavePayload = {
  useProviderDefaults?: boolean;
  from?: { email?: string; name?: string };
  replyTo?: string;
  preheader?: string;
};

export function buildSenderConfigSavePayload({
  hasAgent,
  useProviderDefaults,
  linkState,
  localName,
  localEmail,
  localReplyTo,
  localPreheader,
}: {
  hasAgent: boolean;
  useProviderDefaults: boolean;
  linkState: SenderFieldLinkState;
  localName: string;
  localEmail: string;
  localReplyTo: string;
  localPreheader: string;
}): SenderConfigSavePayload {
  const preheader = localPreheader.trim() || undefined;
  const replyTo = hasAgent && linkState.replyToLinked ? undefined : localReplyTo.trim() || undefined;

  if (useProviderDefaults) {
    return {
      useProviderDefaults: true,
      from: undefined,
      replyTo,
      preheader,
    };
  }

  const fromName = hasAgent && linkState.nameLinked ? undefined : localName.trim() || undefined;
  const fromEmail = hasAgent && linkState.emailLinked ? undefined : localEmail.trim() || undefined;

  const from =
    fromName === undefined && fromEmail === undefined
      ? undefined
      : {
          ...(fromName !== undefined ? { name: fromName } : {}),
          ...(fromEmail !== undefined ? { email: fromEmail } : {}),
        };

  return {
    useProviderDefaults: hasAgent ? false : undefined,
    from,
    replyTo,
    preheader,
  };
}
