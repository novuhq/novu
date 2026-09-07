import { GrafanaProvider } from '@novu/providers';
import { ICredentials, ToolProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseToolHandler } from './base.handler';

export class GrafanaHandler extends BaseToolHandler {
  constructor() {
    super(ToolProviderIdEnum.Grafana, ChannelTypeEnum.TOOL);
  }

  /**
   * Grafana is routed per subscriber. No env-level credentials are read here.
   * The webhook URL + optional bearer token arrive at send time on
   * `options.channelData` (decrypted by the resolver from the endpoint
   * document). See the provider's `resolveRouting` for the runtime contract.
   */
  buildProvider(_: ICredentials) {
    this.provider = new GrafanaProvider();
  }
}
