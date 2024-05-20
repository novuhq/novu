import { IntegrationEntity } from '@novu/dal';
import { ISmsHandler } from './sms.handler.interface';

export interface ISmsFactory {
  getHandler(integration: IntegrationEntity): ISmsHandler | null;
}
