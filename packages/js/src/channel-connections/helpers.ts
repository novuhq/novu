import type { InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import { NovuError } from '../utils/errors';
import type {
  ChannelConnectionResponse,
  DeleteChannelConnectionArgs,
  GenerateChatOAuthUrlArgs,
  GenerateConnectOAuthUrlArgs,
  GetChannelConnectionArgs,
  ListChannelConnectionsArgs,
} from './types';

export const generateChatOAuthUrl = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: GenerateChatOAuthUrlArgs;
}): Result<{ url: string }> => {
  try {
    emitter.emit('channel-connection.oauth-url.pending', { args });
    const data = await apiService.generateChatOAuthUrl(args);
    emitter.emit('channel-connection.oauth-url.resolved', { args, data });

    return { data };
  } catch (error) {
    emitter.emit('channel-connection.oauth-url.resolved', { args, error });

    return { error: new NovuError('Failed to generate chat OAuth URL', error) };
  }
};

export const generateConnectOAuthUrl = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: GenerateConnectOAuthUrlArgs;
}): Result<{ url: string }> => {
  try {
    emitter.emit('channel-connection.oauth-url.pending', { args });
    const data = await apiService.generateConnectOAuthUrl(args);
    emitter.emit('channel-connection.oauth-url.resolved', { args, data });

    return { data };
  } catch (error) {
    emitter.emit('channel-connection.oauth-url.resolved', { args, error });

    return { error: new NovuError('Failed to generate connect OAuth URL', error) };
  }
};

export const listChannelConnections = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: ListChannelConnectionsArgs;
}): Result<ChannelConnectionResponse[]> => {
  try {
    emitter.emit('channel-connections.list.pending', { args });
    const response = await apiService.listChannelConnections(args);
    const data = response.data;
    emitter.emit('channel-connections.list.resolved', { args, data });

    return { data };
  } catch (error) {
    emitter.emit('channel-connections.list.resolved', { args, error });

    return { error: new NovuError('Failed to list channel connections', error) };
  }
};

export const getChannelConnection = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: GetChannelConnectionArgs;
}): Result<ChannelConnectionResponse | null> => {
  try {
    emitter.emit('channel-connection.get.pending', { args });
    const data = await apiService.getChannelConnection(args.identifier);
    emitter.emit('channel-connection.get.resolved', { args, data });

    return { data };
  } catch (error) {
    emitter.emit('channel-connection.get.resolved', { args, error });

    return { error: new NovuError('Failed to get channel connection', error) };
  }
};

export const deleteChannelConnection = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: DeleteChannelConnectionArgs;
}): Result<void> => {
  try {
    emitter.emit('channel-connection.delete.pending', { args });
    await apiService.deleteChannelConnection(args.identifier);
    emitter.emit('channel-connection.delete.resolved', { args });

    return { data: undefined };
  } catch (error) {
    emitter.emit('channel-connection.delete.resolved', { args, error });

    return { error: new NovuError('Failed to delete channel connection', error) };
  }
};
