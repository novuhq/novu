import { onCleanup, onMount } from 'solid-js';
import type { EventHandler, Events, EventNames } from '../../event-emitter';
import { useNovu } from '../context';

export const useNovuEvent = <E extends EventNames>({
  event,
  eventHandler,
}: {
  event: E;
  eventHandler: EventHandler<Events[E]>;
}) => {
  const novu = useNovu();

  onMount(() => {
    novu.on(event, eventHandler);

    onCleanup(() => {
      novu.off(event, eventHandler);
    });
  });
};
