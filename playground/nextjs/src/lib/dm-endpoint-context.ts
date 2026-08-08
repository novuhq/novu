import type { ContextPayload } from '@novu/shared';

type ChannelConnectionLike = {
  identifier?: string;
  providerId?: string;
  contextKeys?: string[];
};

type ChannelEndpointLike = {
  type?: string;
  contextKeys?: string[];
  endpoint?: Record<string, string>;
};

export function hasConnectContext(context?: ContextPayload): boolean {
  return context != null && Object.keys(context).length > 0;
}

export function contextKeysMatch(a?: string[], b?: string[]): boolean {
  const left = [...(a ?? [])].sort();
  const right = [...(b ?? [])].sort();

  return left.length === right.length && left.every((key, index) => key === right[index]);
}

export function findConnectionForProvider(
  connections: ChannelConnectionLike[],
  providerId: string,
  context?: ContextPayload
): string | undefined {
  const matches = connections.filter((connection) => connection.identifier && connection.providerId === providerId);

  if (matches.length === 0) {
    return undefined;
  }

  if (!hasConnectContext(context)) {
    return matches.find((connection) => !connection.contextKeys?.length)?.identifier ?? matches[0]?.identifier;
  }

  return matches.find((connection) => (connection.contextKeys?.length ?? 0) > 0)?.identifier ?? matches[0]?.identifier;
}

export function endpointContextMatches(endpointContextKeys: string[] | undefined, context?: ContextPayload): boolean {
  if (!hasConnectContext(context)) {
    return !endpointContextKeys?.length;
  }

  return (endpointContextKeys?.length ?? 0) > 0;
}

export function findMatchingUserEndpoint<TType extends string>(
  endpoints: ChannelEndpointLike[],
  type: TType,
  userId: string,
  context?: ContextPayload
): ChannelEndpointLike | undefined {
  return endpoints.find((endpoint) => {
    const endpointData = endpoint.endpoint as Record<string, string> | undefined;

    return (
      endpoint.type === type && endpointData?.userId === userId && endpointContextMatches(endpoint.contextKeys, context)
    );
  });
}

export function mismatchedContextEndpointMessage(hasContextOnRequest: boolean): string {
  if (hasContextOnRequest) {
    return (
      'A DM endpoint already exists without matching context. Delete the existing endpoint and recreate it ' +
      'with the same context you use for triggers and OAuth (NovuProvider / events/trigger).'
    );
  }

  return (
    'A DM endpoint already exists with context keys. Pass the same context when creating the endpoint, ' +
    'or delete the existing endpoint first.'
  );
}
