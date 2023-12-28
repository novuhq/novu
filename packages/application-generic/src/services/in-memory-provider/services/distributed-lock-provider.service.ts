import { ProviderService } from './provider.service';
import { IProviderConfiguration } from '../shared/types';

export class DistributedLockProviderService extends ProviderService {
  LOG_CONTEXT = 'DistributedLockProviderService';

  protected getConfigOptions(): IProviderConfiguration {
    const baseOptions = super.getConfigOptions();

    const enableAutoPipelining =
      process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';

    const providerId = process.env.DISTRIBUTED_LOCK_PROVIDER_ID;
    const host = process.env.DISTRIBUTED_LOCK_PROVIDER_HOST;
    const password = process.env.DISTRIBUTED_LOCK_PROVIDER_PASSWORD;
    const ports = process.env.DISTRIBUTED_LOCK_PROVIDER_PORTS;
    const username = process.env.DISTRIBUTED_LOCK_PROVIDER_USERNAME;

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
