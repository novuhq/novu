import { SERVER_HOST } from '../../constants';
import { CloudRegionEnum, DashboardUrlEnum } from './enums';
import { DevCommandOptions } from './types';

export function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getDefaultOrigin(port: string) {
  return `http://${SERVER_HOST}:${port}`;
}

function getDefaultDashboardUrl(region: string) {
  switch (region) {
    case CloudRegionEnum.EU:
      return DashboardUrlEnum.EU;
    case CloudRegionEnum.STAGING:
      return DashboardUrlEnum.STAGING;
    case CloudRegionEnum.US:
    default:
      return DashboardUrlEnum.US;
  }
}

export function parseOptions(options: DevCommandOptions) {
  const { origin, port, region } = options || {};

  return {
    ...options,
    origin: origin || getDefaultOrigin(port),
    dashboardUrl: options.dashboardUrl || getDefaultDashboardUrl(region),
  };
}
