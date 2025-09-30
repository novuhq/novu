import { IntegrationEntity } from '@novu/dal';
import { ISmsHandler } from './sms.handler.interface';

export interface ISmsFactory {
  getHandler(
    integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>
  ): ISmsHandler | null;
}
