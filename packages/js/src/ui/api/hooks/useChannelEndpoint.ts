import { createEffect, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import type {
  ChannelEndpointResponse,
  CreateChannelEndpointArgs,
  GenerateLinkUserOAuthUrlArgs,
} from '../../../channel-connections/types';
import { useNovu } from '../../context';

export type UseChannelEndpointOptions = {
  endpointIdentifier?: string;
  subscriberId?: string;
  integrationIdentifier?: string;
  connectionIdentifier?: string;
};

export const useChannelEndpoint = (options: UseChannelEndpointOptions) => {
  const novuAccessor = useNovu();
  const [loading, setLoading] = createSignal(true);

  const [endpoint, { mutate, refetch }] = createResource(options, async ({ endpointIdentifier }) => {
    try {
      if (!endpointIdentifier) {
        return null;
      }

      const response = await novuAccessor().channelEndpoints.get({
        identifier: endpointIdentifier,
      });

      return response.data ?? null;
    } catch {
      return null;
    }
  });

  const generateLinkUserOAuthUrl = async (args: GenerateLinkUserOAuthUrlArgs) => {
    return novuAccessor().channelEndpoints.generateLinkUserOAuthUrl(args);
  };

  const create = async (args: CreateChannelEndpointArgs) => {
    setLoading(true);
    const response = await novuAccessor().channelEndpoints.create(args);
    if (response.data) {
      mutate(response.data);
    }
    setLoading(false);

    return response;
  };

  const remove = async (identifier: string) => {
    setLoading(true);
    const response = await novuAccessor().channelEndpoints.delete({ identifier });
    if (!response.error) {
      mutate(null);
    }
    setLoading(false);

    return response;
  };

  onMount(() => {
    const currentNovu = novuAccessor();

    const cleanupCreatePending = currentNovu.on('channel-endpoint.create.pending', () => {
      setLoading(true);
    });

    const cleanupCreateResolved = currentNovu.on('channel-endpoint.create.resolved', ({ data }) => {
      mutate((data as ChannelEndpointResponse) ?? null);
      setLoading(false);
    });

    const cleanupDeletePending = currentNovu.on('channel-endpoint.delete.pending', ({ args }) => {
      if (!args || args.identifier !== options.endpointIdentifier) {
        return;
      }
      setLoading(true);
    });

    const cleanupDeleteResolved = currentNovu.on('channel-endpoint.delete.resolved', ({ args }) => {
      if (!args || args.identifier !== options.endpointIdentifier) {
        return;
      }
      mutate(null);
      setLoading(false);
    });

    onCleanup(() => {
      cleanupCreatePending();
      cleanupCreateResolved();
      cleanupDeletePending();
      cleanupDeleteResolved();
    });
  });

  createEffect(() => {
    setLoading(endpoint.loading);
  });

  return { endpoint, loading, mutate, refetch, generateLinkUserOAuthUrl, create, remove };
};
