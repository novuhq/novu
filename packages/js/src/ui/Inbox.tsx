import { For, createSignal, onMount } from 'solid-js';
import { Notification } from '../feeds';
import type { NovuOptions } from '../novu';
import { Appearance, AppearanceProvider } from './context';
import { useStyle } from './helpers';
import { Localization, LocalizationProvider, useLocalization } from './context/LocalizationContext';

type InboxProps = {
  id: string;
  name: string;
  options: NovuOptions;
  appearance?: Appearance;
  localization?: Localization;
};

export const Inbox = (props: InboxProps) => {
  const [feeds, setFeeds] = createSignal<Notification[]>([]);

  return (
    <LocalizationProvider localization={props.localization}>
      <AppearanceProvider id={props.id} elements={props.appearance?.elements} variables={props.appearance?.variables}>
        <InternalInbox feeds={feeds()} />
      </AppearanceProvider>
    </LocalizationProvider>
  );
};

type InternalInboxProps = {
  feeds: Notification[];
};

const InternalInbox = (props: InternalInboxProps) => {
  const style = useStyle();
  const { t } = useLocalization();

  return (
    <div class={style('novu', 'root')}>
      <div class="nt-bg-primary-500 nt-p-3 nt-m-4">
        <div class="nt-text-2xl nt-font-bold">{t('inbox.title')}</div>
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
