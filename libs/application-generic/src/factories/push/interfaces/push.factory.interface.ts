import { IntegrationEntity } from '@novu/dal';
import { IPushHandler } from './push.handler.interface';

export interface IPushFactory {
  getHandler(
    integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>
  ): IPushHandler | null;
}
