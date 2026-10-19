import { InboxService } from '../api';
import { BaseModule } from '../base-module';
import { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import {
  deleteChannelConnection,
  generateChatOAuthUrl,
  generateConnectOAuthUrl,
  getChannelConnection,
  listChannelConnections,
} from './helpers';
import type {
  ChannelConnectionResponse,
  DeleteChannelConnectionArgs,
  GenerateChatOAuthUrlArgs,
  GenerateConnectOAuthUrlArgs,
  GetChannelConnectionArgs,
  ListChannelConnectionsArgs,
} from './types';

export class ChannelConnections extends BaseModule {
  constructor({
    inboxServiceInstance,
    eventEmitterInstance,
  }: {
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
  }) {
    super({ inboxServiceInstance, eventEmitterInstance });
  }

  /**
   * @deprecated Use generateConnectOAuthUrl() instead. For user-level linking use channelEndpoints.generateLinkUserOAuthUrl().
   */
  async generateOAuthUrl(args: GenerateChatOAuthUrlArgs): Result<{ url: string }> {
    return this.callWithSession(() =>
      generateChatOAuthUrl({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async generateConnectOAuthUrl(args: GenerateConnectOAuthUrlArgs): Result<{ url: string }> {
    return this.callWithSession(() =>
      generateConnectOAuthUrl({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async list(args: ListChannelConnectionsArgs = {}): Result<ChannelConnectionResponse[]> {
    return this.callWithSession(() =>
      listChannelConnections({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async get(args: GetChannelConnectionArgs): Result<ChannelConnectionResponse | null> {
    return this.callWithSession(() =>
      getChannelConnection({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async delete(args: DeleteChannelConnectionArgs): Result<void> {
    return this.callWithSession(() =>
      deleteChannelConnection({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }
}
