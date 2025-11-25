import { createEffect, onCleanup } from 'solid-js';
import type { EventHandler, EventNames, Events } from '../../event-emitter';
import { useNovu } from '../context';

export const useNovuEvent = <E extends EventNames>({
  event,
  eventHandler,
}: {
  event: E;
  eventHandler: EventHandler<Events[E]>;
}) => {
  const novuAccessor = useNovu();

  createEffect(() => {
    const currentNovu = novuAccessor();
    const cleanup = currentNovu.on(event, eventHandler);

    onCleanup(() => {
      cleanup();
    });
  });
};
