import { EventEmitter } from 'events';
import { ITriggerPayloadOptions } from './subscribers/subscriber.interface';

export interface INovu extends EventEmitter {
  trigger(eventId: string, data: ITriggerPayloadOptions);
}

export interface INovuConfiguration {
  backendUrl?: string;
}
