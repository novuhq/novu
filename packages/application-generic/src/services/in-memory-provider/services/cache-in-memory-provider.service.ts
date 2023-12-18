import { ProviderService } from './provider.service';
import { IProviderConfiguration } from '../shared/types';

export class CacheInMemoryProviderService extends ProviderService {
  LOG_CONTEXT = 'CacheInMemoryProviderService';

  protected getConfigOptions(): IProviderConfiguration {
    const baseOptions = super.getConfigOptions();

    const enableAutoPipelining =
      process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';

    const providerId = process.env.CACHE_PROVIDER_ID;
    const host = process.env.CACHE_HOST;
    const password = process.env.CACHE_PASSWORD;
    const ports = process.env.CACHE_PORTS;
    const username = process.env.CACHE_USERNAME;

    const processEnvOptions = {
      providerId,
      host,
      password,
      ports,
      username,
    };

    return {
      envOptions: { ...baseOptions.envOptions, ...processEnvOptions },
      options: { ...baseOptions.options, enableAutoPipelining },
    };
  }
}
