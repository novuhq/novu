import { CloudRegionEnum } from '../dev/enums';
import { resolveRegionUrls } from '../dev/resolve-region-urls';
import type { AgentConnectMode, ConnectCommandOptions } from './types';

export const CONNECT_REGION_VALUES = Object.values(CloudRegionEnum) as CloudRegionEnum[];

export type ConnectCommandInput = Omit<ConnectCommandOptions, 'apiUrl' | 'dashboardUrl' | 'connectDashboardUrl'> & {
  apiUrl?: string;
  dashboardUrl?: string;
  connectDashboardUrl?: string;
};

function resolveRuntimeFromFlags(input: ConnectCommandInput): AgentConnectMode | undefined {
  if (input.chatSdk || input.brain === 'chat-sdk') {
    return 'chat-sdk';
  }

  return input.runtime;
}

export function resolveConnectCommandOptions(input: ConnectCommandInput): ConnectCommandOptions {
  const region = input.region;
  if (!CONNECT_REGION_VALUES.includes(region)) {
    throw new Error(`Invalid --region "${region}". Expected one of: ${CONNECT_REGION_VALUES.join(', ')}.`);
  }

  const urls = resolveRegionUrls(region, {
    apiUrl: input.apiUrl,
    dashboardUrl: input.dashboardUrl,
    connectDashboardUrl: input.connectDashboardUrl,
  });

  const runtime = resolveRuntimeFromFlags(input);

  return {
    ...input,
    region,
    runtime,
    apiUrl: urls.apiUrl,
    dashboardUrl: urls.dashboardUrl,
    connectDashboardUrl: urls.connectDashboardUrl,
  };
}
