import { OpsgenieProvider } from '@novu/providers';
import { ICredentials, ToolProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseToolHandler } from './base.handler';

export class OpsgenieHandler extends BaseToolHandler {
  constructor() {
    super(ToolProviderIdEnum.Opsgenie, ChannelTypeEnum.TOOL);
  }

  /**
   * Opsgenie is routed per subscriber. No env-level credentials are read here.
   * The API integration key + region arrive at send time on `options.channelData`
   * (populated by the resolver from the linked `ChannelConnection.auth`). See the
   * provider's `resolveRouting` for the runtime contract.
   */
  buildProvider(_: ICredentials) {
    this.provider = new OpsgenieProvider();
  }
}
