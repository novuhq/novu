import { CloudRegionEnum } from '../dev/enums';
import { resolveRegionUrls } from '../dev/resolve-region-urls';
import type { ConnectCommandOptions } from './types';

export const CONNECT_REGION_VALUES = Object.values(CloudRegionEnum) as CloudRegionEnum[];

export type ConnectCommandInput = Omit<ConnectCommandOptions, 'apiUrl' | 'dashboardUrl' | 'connectDashboardUrl'> & {
  apiUrl?: string;
  dashboardUrl?: string;
  connectDashboardUrl?: string;
};

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

  return {
    ...input,
    region,
    apiUrl: urls.apiUrl,
    dashboardUrl: urls.dashboardUrl,
    connectDashboardUrl: urls.connectDashboardUrl,
  };
}
