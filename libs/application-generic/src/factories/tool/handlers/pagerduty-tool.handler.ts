import { PagerDutyRegion, PagerDutyToolProvider } from '@novu/providers';
import { ICredentials, ToolProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseToolHandler } from './base.handler';

function normalizePagerDutyRegion(region?: string): PagerDutyRegion {
  if (region?.toLowerCase() === 'eu') {
    return 'eu';
  }

  return 'us';
}

export class PagerDutyToolHandler extends BaseToolHandler {
  constructor() {
    super(ToolProviderIdEnum.PagerDuty, ChannelTypeEnum.TOOL);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey) {
      throw new Error('Config is not valid for pagerduty tool provider');
    }

    // Stored as apiKey (encrypted via secureCredentials); PagerDuty calls this the Events API routing_key.
    this.provider = new PagerDutyToolProvider({
      routingKey: credentials.apiKey,
      region: normalizePagerDutyRegion(credentials.region),
    });
  }
}
