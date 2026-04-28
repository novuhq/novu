import type { InboxService } from '../api';
import type {
  ChannelEndpointResponse,
  CreateChannelEndpointArgs,
  DeleteChannelEndpointArgs,
  GenerateLinkUserOAuthUrlArgs,
  GetChannelEndpointArgs,
  ListChannelEndpointsArgs,
} from '../channel-connections/types';
import type { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import { NovuError } from '../utils/errors';

export const generateLinkUserOAuthUrl = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: GenerateLinkUserOAuthUrlArgs;
}): Result<{ url: string }> => {
  try {
    emitter.emit('channel-endpoint.oauth-url.pending', { args });
    const data = await apiService.generateLinkUserOAuthUrl(args);
    emitter.emit('channel-endpoint.oauth-url.resolved', { args, data });

    return { data };
  } catch (error) {
    emitter.emit('channel-endpoint.oauth-url.resolved', { args, error });

    return { error: new NovuError('Failed to generate link user OAuth URL', error) };
  }
};

export const listChannelEndpoints = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: ListChannelEndpointsArgs;
}): Result<ChannelEndpointResponse[]> => {
  try {
    emitter.emit('channel-endpoints.list.pending', { args });
    const response = await apiService.listChannelEndpoints(args);
    const data = response.data;
    emitter.emit('channel-endpoints.list.resolved', { args, data });

    return { data };
  } catch (error) {
    emitter.emit('channel-endpoints.list.resolved', { args, error });

    return { error: new NovuError('Failed to list channel endpoints', error) };
  }
};

export const getChannelEndpoint = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: GetChannelEndpointArgs;
}): Result<ChannelEndpointResponse | null> => {
  try {
    emitter.emit('channel-endpoint.get.pending', { args });
    const data = await apiService.getChannelEndpoint(args.identifier);
    emitter.emit('channel-endpoint.get.resolved', { args, data });

    return { data };
  } catch (error) {
    emitter.emit('channel-endpoint.get.resolved', { args, error });

    return { error: new NovuError('Failed to get channel endpoint', error) };
  }
};

export const createChannelEndpoint = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: CreateChannelEndpointArgs;
}): Result<ChannelEndpointResponse> => {
  try {
    emitter.emit('channel-endpoint.create.pending', { args });
    const data = await apiService.createChannelEndpoint(args);
    emitter.emit('channel-endpoint.create.resolved', { args, data });

    return { data };
  } catch (error) {
    emitter.emit('channel-endpoint.create.resolved', { args, error });

    return { error: new NovuError('Failed to create channel endpoint', error) };
  }
};

export const deleteChannelEndpoint = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: DeleteChannelEndpointArgs;
}): Result<void> => {
  try {
    emitter.emit('channel-endpoint.delete.pending', { args });
    await apiService.deleteChannelEndpoint(args.identifier);
    emitter.emit('channel-endpoint.delete.resolved', { args });

    return { data: undefined };
  } catch (error) {
    emitter.emit('channel-endpoint.delete.resolved', { args, error });

    return { error: new NovuError('Failed to delete channel endpoint', error) };
  }
};
