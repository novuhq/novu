import { EnvoyCommandOptions, ResolvedAuth } from '../types';
import { browserDeviceAuth } from './device-auth';

export async function resolveAuth(options: EnvoyCommandOptions): Promise<ResolvedAuth> {
  const cliFlagSecret = options.secretKey?.trim();
  if (cliFlagSecret) {
    return {
      secretKey: cliFlagSecret,
      environmentId: '',
      environmentSlug: null,
      environmentName: null,
      organizationId: null,
      apiUrl: options.apiUrl,
      dashboardUrl: options.dashboardUrl,
      region: options.region,
      source: 'cli-flag',
    };
  }

  const envSecret = process.env.NOVU_SECRET_KEY?.trim();
  if (envSecret) {
    return {
      secretKey: envSecret,
      environmentId: '',
      environmentSlug: null,
      environmentName: null,
      organizationId: null,
      apiUrl: options.apiUrl,
      dashboardUrl: options.dashboardUrl,
      region: options.region,
      source: 'env',
    };
  }

  return browserDeviceAuth({
    apiUrl: options.apiUrl,
    dashboardUrl: options.dashboardUrl,
    region: options.region,
  });
}
