import { For, createSignal, onMount } from 'solid-js';
import { Notification } from '../feeds';
import { Novu } from '../novu';
import type { NovuOptions } from '../novu';
import { Appearance, AppearanceProvider } from './context';
import { useStyle } from './helpers';

type InboxProps = {
  name: string;
  options: NovuOptions;
  appearance?: Appearance;
};

export const Inbox = (props: InboxProps) => {
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

type InternalInboxProps = {
  feeds: Notification[];
};

const InternalInbox = (props: InternalInboxProps) => {
  const style = useStyle();

  return (
    <div class={style('novu', 'root')}>
      <div class="nt-bg-primary-500 nt-p-3 nt-m-4">
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
