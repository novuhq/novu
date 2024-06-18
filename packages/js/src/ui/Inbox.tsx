import { For, createSignal, onMount, type Component } from 'solid-js';
import { Notification } from '../feeds';
import { Novu } from '../novu';
import type { NovuOptions } from '../novu';
import { AppearanceContextType, AppearanceProvider } from './context';
import { getStyle } from './helpers';

const Inbox: Component<{
  name: string;
  options: NovuOptions;
  appearance?: Pick<AppearanceContextType, 'elements' | 'variables'>;
}> = (props) => {
  const [feeds, setFeeds] = createSignal<Notification[]>([]);

  onMount(() => {
    const novu = new Novu(props.options);

    // eslint-disable-next-line promise/always-return
    novu.feeds.fetch().then((data) => {
      setFeeds(data.data);
    });
  });

  return (
    <AppearanceProvider elements={props.appearance?.elements} variables={props.appearance?.variables}>
      <InternalInbox feeds={feeds()} />
    </AppearanceProvider>
  );
};

export default Inbox;

const InternalInbox: Component<{
  feeds: Notification[];
}> = (props) => {
  const style = getStyle();

  return (
    <div class={style('novu', 'root')}>
      <div class="bg-red-400 p-3 m-4">
        <div class="text-2xl font-bold">Inbox</div>
        <button class={style('tw-bg-red-500', 'button')}>test</button>
        <For each={props.feeds}>
          {(feed) => (
            <div>
              <h2>{feed.body}</h2>
              <p>{feed.createdAt}</p>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
