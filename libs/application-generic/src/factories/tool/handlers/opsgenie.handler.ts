import { OpsgenieProvider, OpsgenieRegion } from '@novu/providers';
import { ICredentials, ToolProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseToolHandler } from './base.handler';

function normalizeOpsgenieRegion(region?: string): OpsgenieRegion {
  if (region?.toLowerCase() === 'eu') {
    return 'eu';
  }

  return 'us';
}

export class OpsgenieHandler extends BaseToolHandler {
  constructor() {
    super(ToolProviderIdEnum.Opsgenie, ChannelTypeEnum.TOOL);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.apiKey) {
      throw new Error('Config is not valid for opsgenie provider');
    }

    this.provider = new OpsgenieProvider({
      apiKey: credentials.apiKey,
      region: normalizeOpsgenieRegion(credentials.region),
    });
  }
}
