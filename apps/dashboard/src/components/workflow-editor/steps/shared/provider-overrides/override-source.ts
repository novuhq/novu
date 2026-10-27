import { ChannelTypeEnum, type ContentOverrideProviderId, getContentOverrideProviderIds } from '@novu/shared';

export const DEFAULT_CONTENT_SOURCE = 'default' as const;

export const PROVIDER_OVERRIDES_FIELD = 'providerOverrides';

export const INTEGRATION_OVERRIDES_FIELD = 'integrationOverrides';

/** Channels whose steps can carry per-provider content overrides. */
export type OverrideChannel = ChannelTypeEnum.CHAT | ChannelTypeEnum.TOOL | ChannelTypeEnum.PUSH;

/** A provider override, applied to every integration of that provider. */
export type ProviderOverrideSource = {
  kind: 'provider';
  providerId: ContentOverrideProviderId;
};

/** One integration's override, merged on top of its provider override. */
export type IntegrationOverrideSource = {
  kind: 'integration';
  providerId: ContentOverrideProviderId;
  integrationIdentifier: string;
};

export type OverrideContentSource = ProviderOverrideSource | IntegrationOverrideSource;

export type ContentSource = typeof DEFAULT_CONTENT_SOURCE | OverrideContentSource;

export type ProviderOverrides = Partial<Record<ContentOverrideProviderId, Record<string, unknown>>>;

/** Keyed by providerId, then by integration identifier. */
export type IntegrationOverrides = Partial<Record<ContentOverrideProviderId, Record<string, Record<string, unknown>>>>;

/** The override form fields; the preview API echoes the same two maps, Liquid-resolved. */
export type OverrideValues = {
  providerOverrides?: ProviderOverrides | null;
  integrationOverrides?: IntegrationOverrides | null;
};

export function providerSource(providerId: ContentOverrideProviderId): ProviderOverrideSource {
  return { kind: 'provider', providerId };
}

export function integrationSource(
  providerId: ContentOverrideProviderId,
  integrationIdentifier: string
): IntegrationOverrideSource {
  return { kind: 'integration', providerId, integrationIdentifier };
}

/** The layer a source's override is merged over: an integration's provider, or nothing for a provider. */
export function getParentSource(source: OverrideContentSource): ProviderOverrideSource | undefined {
  switch (source.kind) {
    case 'provider':
      return undefined;
    case 'integration':
      return providerSource(source.providerId);
    default: {
      const unhandled: never = source;

      return unhandled;
    }
  }
}

/** Integration identifiers are free-form, so `in` would also match prototype keys like `constructor`. */
export function hasOwn(target: object | null | undefined, key: string): boolean {
  return !!target && Object.prototype.hasOwnProperty.call(target, key);
}

export function isContentOverrideProviderId(
  channel: OverrideChannel,
  value: string
): value is ContentOverrideProviderId {
  return (getContentOverrideProviderIds(channel) as readonly string[]).includes(value);
}

export function isSameContentSource(left: ContentSource, right: ContentSource): boolean {
  if (left === DEFAULT_CONTENT_SOURCE || right === DEFAULT_CONTENT_SOURCE) {
    return left === right;
  }

  return getOverridePath(left) === getOverridePath(right);
}

export function getOverrideFormField(
  source: OverrideContentSource
): typeof PROVIDER_OVERRIDES_FIELD | typeof INTEGRATION_OVERRIDES_FIELD {
  switch (source.kind) {
    case 'provider':
      return PROVIDER_OVERRIDES_FIELD;
    case 'integration':
      return INTEGRATION_OVERRIDES_FIELD;
    default: {
      const unhandled: never = source;

      return unhandled;
    }
  }
}

/** The source's control path, which server control issues for its override are namespaced under. */
export function getOverridePath(source: OverrideContentSource): string {
  switch (source.kind) {
    case 'provider':
      return `${PROVIDER_OVERRIDES_FIELD}.${source.providerId}`;
    case 'integration':
      return `${INTEGRATION_OVERRIDES_FIELD}.${source.providerId}.${source.integrationIdentifier}`;
    default: {
      const unhandled: never = source;

      return unhandled;
    }
  }
}

export function getSourceOverride(
  source: OverrideContentSource,
  values: OverrideValues
): Record<string, unknown> | undefined {
  switch (source.kind) {
    case 'provider':
      return hasOwn(values.providerOverrides, source.providerId)
        ? values.providerOverrides?.[source.providerId]
        : undefined;
    case 'integration': {
      const overridesByIdentifier = values.integrationOverrides?.[source.providerId];

      return hasOwn(overridesByIdentifier, source.integrationIdentifier)
        ? overridesByIdentifier?.[source.integrationIdentifier]
        : undefined;
    }
    default: {
      const unhandled: never = source;

      return unhandled;
    }
  }
}

/** Sets one entry in place (or removes it when `value` is undefined); an emptied map becomes `null`. */
function withEntry<T>(
  map: Partial<Record<string, T>> | null | undefined,
  key: string,
  value: T | undefined
): Record<string, T> | null {
  const next = { ...map } as Record<string, T>;

  if (value === undefined) {
    delete next[key];
  } else {
    next[key] = value;
  }

  return Object.keys(next).length > 0 ? next : null;
}

/**
 * The next value of the source's form field (`getOverrideFormField`) after setting its override, or
 * removing it when `next` is undefined. Emptied per-provider integration maps are dropped, and an
 * emptied field becomes `null` — the save API's delete-all contract, where `undefined` would be omitted
 * and leave the stored overrides intact.
 */
export function updateSourceOverride(
  source: OverrideContentSource,
  values: OverrideValues,
  next: Record<string, unknown> | undefined
): ProviderOverrides | IntegrationOverrides | null {
  switch (source.kind) {
    case 'provider':
      return withEntry(values.providerOverrides, source.providerId, next);
    case 'integration': {
      const overridesByIdentifier = withEntry(
        values.integrationOverrides?.[source.providerId],
        source.integrationIdentifier,
        next
      );

      return withEntry(values.integrationOverrides, source.providerId, overridesByIdentifier ?? undefined);
    }
    default: {
      const unhandled: never = source;

      return unhandled;
    }
  }
}

export type SourceOverride = { source: OverrideContentSource; override: Record<string, unknown> };

/** Every override held in the form for this channel's providers, in map order. */
export function listSourceOverrides(channel: OverrideChannel, values: OverrideValues): SourceOverride[] {
  const providerEntries = Object.entries(values.providerOverrides ?? {}).flatMap(([providerId, override]) =>
    isContentOverrideProviderId(channel, providerId)
      ? [{ source: providerSource(providerId), override: override ?? {} }]
      : []
  );
  const integrationEntries = Object.entries(values.integrationOverrides ?? {}).flatMap(
    ([providerId, overridesByIdentifier]) =>
      isContentOverrideProviderId(channel, providerId)
        ? Object.entries(overridesByIdentifier ?? {}).map(([integrationIdentifier, override]) => ({
            source: integrationSource(providerId, integrationIdentifier),
            override,
          }))
        : []
  );

  return [...providerEntries, ...integrationEntries];
}
