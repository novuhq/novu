import { For, createSignal, onMount, type Component } from 'solid-js';
import { Notification } from '../feeds';
import { Novu } from '../novu';
import type { NovuOptions } from '../novu';

const Inbox: Component<{
  name: string;
  options: NovuOptions;
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
    <div class="bg-red-400 p-3 m-4">
      <div class="text-2xl font-bold">Inbox</div>
      <div>Vanilla Extract Class</div>
      <For each={feeds()}>
        {(feed) => (
          <div>
            <h2>{feed.body}</h2>
            <p>{feed.createdAt}</p>
          </div>
        )}
      </For>
    </div>
  );
};

export default Inbox;
