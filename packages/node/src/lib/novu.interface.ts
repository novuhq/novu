import { ITriggerPayloadOptions } from '@novu/shared';
import { EventEmitter } from 'events';

export interface INovu extends EventEmitter {
  trigger(eventId: string, data: ITriggerPayloadOptions);
}

export interface INovuConfiguration {
  backendUrl?: string;
}
