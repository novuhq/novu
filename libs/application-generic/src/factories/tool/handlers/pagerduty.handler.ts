import { PagerDutyProvider } from '@novu/providers';
import { ICredentials, ToolProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseToolHandler } from './base.handler';

export class PagerDutyHandler extends BaseToolHandler {
  constructor() {
    super(ToolProviderIdEnum.PagerDuty, ChannelTypeEnum.TOOL);
  }

  /**
   * PagerDuty is routed per subscriber — no env-level credentials are read here.
   * The routing key + region arrive at send time on `options.channelData` (populated
   * by the resolver from the linked `ChannelConnection.auth`). See the provider's
   * `resolveRouting` for the runtime contract.
   */
  buildProvider(_: ICredentials) {
    this.provider = new PagerDutyProvider();
  }
}
