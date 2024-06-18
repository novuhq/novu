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
      <div class="nt-bg-red-400 nt-p-3 nt-m-4">
        <div class="nt-text-2xl nt-font-bold">Inbox</div>
        <button class={style('nt-bg-red-500', 'button')}>test</button>
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
