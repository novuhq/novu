import { IProviderConfiguration } from '../shared/types';
import { ProviderService } from './provider.service';

export class CommunicationInMemoryProviderService extends ProviderService {
  LOG_CONTEXT = 'CommunicationInMemoryProviderService';

  protected getConfigOptions(): IProviderConfiguration {
    const baseOptions = super.getConfigOptions();

    const enableAutoPipelining =
      process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';

    const providerId = process.env.COMMUNICATION_PROVIDER_ID;
    const host = process.env.COMMUNICATION_PROVIDER_HOST;
    const password = process.env.COMMUNICATION_PROVIDER_PASSWORD;
    const ports = process.env.COMMUNICATION_PROVIDER_PORTS;
    const username = process.env.COMMUNICATION_PROVIDER_USERNAME;

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
