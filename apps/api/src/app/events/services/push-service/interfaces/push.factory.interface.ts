import { IntegrationEntity } from '@novu/dal';
import { IPushHandler } from './push.handler.interface';

export interface IPushFactory {
  getHandler(integration: IntegrationEntity): IPushHandler | null;
}
