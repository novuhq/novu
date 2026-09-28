import type { EventHandler, EventNames, Events } from '../../event-emitter';
import { useNovu } from '../context';
import { createNovuEventEffect } from '../core/stores/events';

export const useNovuEvent = <E extends EventNames>({
  event,
  eventHandler,
}: {
  event: E;
  eventHandler: EventHandler<Events[E]>;
}) => {
  createNovuEventEffect(useNovu(), event, eventHandler);
};
