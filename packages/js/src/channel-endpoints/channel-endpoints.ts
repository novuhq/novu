import { InboxService } from '../api';
import { BaseModule } from '../base-module';
import type {
  ChannelEndpointResponse,
  CreateChannelEndpointArgs,
  DeleteChannelEndpointArgs,
  GenerateLinkUserOAuthUrlArgs,
  GetChannelEndpointArgs,
  ListChannelEndpointsArgs,
} from '../channel-connections/types';
import { NovuEventEmitter } from '../event-emitter';
import type { Result } from '../types';
import {
  createChannelEndpoint,
  deleteChannelEndpoint,
  generateLinkUserOAuthUrl,
  getChannelEndpoint,
  listChannelEndpoints,
} from './helpers';

export class ChannelEndpoints extends BaseModule {
  constructor({
    inboxServiceInstance,
    eventEmitterInstance,
  }: {
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
  }) {
    super({ inboxServiceInstance, eventEmitterInstance });
  }

  async generateLinkUserOAuthUrl(args: GenerateLinkUserOAuthUrlArgs): Result<{ url: string }> {
    return this.callWithSession(() =>
      generateLinkUserOAuthUrl({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async list(args: ListChannelEndpointsArgs = {}): Result<ChannelEndpointResponse[]> {
    return this.callWithSession(() =>
      listChannelEndpoints({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async get(args: GetChannelEndpointArgs): Result<ChannelEndpointResponse | null> {
    return this.callWithSession(() =>
      getChannelEndpoint({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async create(args: CreateChannelEndpointArgs): Result<ChannelEndpointResponse> {
    return this.callWithSession(() =>
      createChannelEndpoint({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }

  async delete(args: DeleteChannelEndpointArgs): Result<void> {
    return this.callWithSession(() =>
      deleteChannelEndpoint({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }
}
