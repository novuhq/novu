import { For, createSignal, onMount, type Component } from 'solid-js';
import { Notification } from 'src/feeds';
import { Novu } from 'src/novu';

const App: Component<{
  name: string;
  options: {
    applicationIdentifier: string;
    subscriberId: string;
  };
}> = (props) => {
  // const novu = new Novu(props);

  const [feeds, setFeeds] = createSignal<Notification[]>([]);

  onMount(() => {
    const novu = new Novu(props.options);

    // eslint-disable-next-line promise/always-return
    novu.feeds.fetch().then((data) => {
      setFeeds(data.data);
    });
  });

  return (
    <div>
      <header>Hello {props.name} </header>
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

export default App;
