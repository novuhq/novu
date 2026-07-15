import { PagerDutyProvider, PagerDutyRegion } from '@novu/providers';
import { ICredentials, ToolProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseToolHandler } from './base.handler';

function normalizePagerDutyRegion(region?: string): PagerDutyRegion {
  if (region?.toLowerCase() === 'eu') {
    return 'eu';
  }

  return 'us';
}

export class PagerDutyHandler extends BaseToolHandler {
  constructor() {
    super(ToolProviderIdEnum.PagerDuty, ChannelTypeEnum.TOOL);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey) {
      throw new Error('Config is not valid for pagerduty provider');
    }

    // Stored as apiKey (encrypted via secureCredentials); PagerDuty calls this the Events API routing_key.
    this.provider = new PagerDutyProvider({
      routingKey: credentials.apiKey,
      region: normalizePagerDutyRegion(credentials.region),
    });
  }
}
