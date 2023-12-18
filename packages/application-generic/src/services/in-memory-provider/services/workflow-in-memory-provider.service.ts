import { IProviderConfiguration } from '../shared/types';
import { ProviderService } from './provider.service';

export class WorkflowInMemoryProviderService extends ProviderService {
  LOG_CONTEXT = 'WorkflowInMemoryProviderService';

  protected getConfigOptions(): IProviderConfiguration {
    const baseOptions = super.getConfigOptions();

    const enableAutoPipelining =
      process.env.REDIS_CACHE_ENABLE_AUTOPIPELINING === 'true';

    const providerId = process.env.WORKFLOW_PROVIDER_ID;
    const host = process.env.WORKFLOW_HOST;
    const password = process.env.WORKFLOW_PASSWORD;
    const ports = process.env.WORKFLOW_PORTS;
    const username = process.env.WORKFLOW_USERNAME;

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
