import { For, onCleanup, onMount } from 'solid-js';
import { MountableElement, Portal } from 'solid-js/web';
import { NovuUI } from '..';
import { NovuOptions } from '../../novu';
import {
  Appearance,
  AppearanceProvider,
  FocusManagerProvider,
  InboxProvider,
  Localization,
  LocalizationProvider,
  NovuProvider,
} from '../context';
import { UnreadCountProvider } from '../context/UnreadCountContext';
import type { Tab } from '../types';
import { Bell, Root, Preferences } from './elements';
import { Inbox } from './Inbox';
import { NotificationList as Notifications } from './Notification';

export const novuComponents = {
  Inbox,
  Bell,
  Preferences,
  Notifications,
};

export type NovuComponent = { name: NovuComponentName; props?: any };

export type NovuMounterProps = NovuComponent & { element: MountableElement };

export type NovuComponentName = keyof typeof novuComponents;

export type NovuComponentControls = {
  mount: (params: NovuMounterProps) => void;
  unmount: (params: { element: MountableElement }) => void;
  updateProps: (params: { element: MountableElement; props: unknown }) => void;
};

type RendererProps = {
  novuUI: NovuUI;
  defaultCss: string;
  appearance?: Appearance;
  nodes: Map<MountableElement, NovuComponent>;
  localization?: Localization;
  options: NovuOptions;
  tabs: Array<Tab>;
};

export const Renderer = (props: RendererProps) => {
  onMount(() => {
    const id = 'novu-default-css';
    const el = document.getElementById(id);
    if (el) {
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = id;
    document.head.insertBefore(styleEl, document.head.firstChild);
    styleEl.innerHTML = props.defaultCss;

    onCleanup(() => {
      const element = document.getElementById(id);
      element?.remove();
    });
  });

  return (
    <NovuProvider options={props.options}>
      <UnreadCountProvider>
        <LocalizationProvider localization={props.localization}>
          <AppearanceProvider id={props.novuUI.id} appearance={props.appearance}>
            <FocusManagerProvider>
              <InboxProvider tabs={props.tabs}>
                <For each={[...props.nodes]}>
                  {([node, component]) => {
                    const Component = novuComponents[component.name];

                    return (
                      <Portal mount={node}>
                        <Root>
                          <Component {...component.props} />
                        </Root>
                      </Portal>
                    );
                  }}
                </For>
              </InboxProvider>
            </FocusManagerProvider>
          </AppearanceProvider>
        </LocalizationProvider>
      </UnreadCountProvider>
    </NovuProvider>
  );
};
