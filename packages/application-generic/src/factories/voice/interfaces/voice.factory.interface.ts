import { IntegrationEntity } from '@novu/dal';
import { IVoiceHandler } from './voice.handler.interface';

export interface IVoiceFactory {
  getHandler(integration: IntegrationEntity): IVoiceHandler | null;
}
