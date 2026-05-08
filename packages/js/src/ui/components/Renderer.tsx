// @ts-expect-error inline import esbuild syntax
import css from 'directcss:../index.directcss';
import { Accessor, createMemo, For, onCleanup, onMount, Show } from 'solid-js';
import { MountableElement, Portal } from 'solid-js/web';
import { Novu } from '../../novu';
import type { NovuOptions } from '../../types';
import { NovuUI } from '..';
import {
  AppearanceProvider,
  CountProvider,
  FocusManagerProvider,
  InboxProvider,
  LocalizationProvider,
  NovuProvider,
} from '../context';
import { NOVU_DEFAULT_CSS_ID } from '../helpers/utils';
import type {
  AllAppearance,
  AllLocalization,
  PreferenceGroups,
  PreferencesFilter,
  PreferencesSort,
  RouterPush,
  Tab,
} from '../types';
import { ConnectChat } from './connect-chat/ConnectChat';
import { Bell, Root } from './elements';
import { Inbox, InboxContent, InboxContentProps, InboxPage } from './Inbox';
import { MsTeamsConnectButton } from './msteams-connect-button/MsTeamsConnectButton';
import { MsTeamsLinkUser } from './msteams-link-user/MsTeamsLinkUser';
import { SlackConnectButton } from './slack-connect-button/SlackConnectButton';
import { SlackLinkUser } from './slack-link-user/SlackLinkUser';
import { Subscription } from './subscription/Subscription';
import { SubscriptionButtonWrapper as SubscriptionButton } from './subscription/SubscriptionButtonWrapper';
import { SubscriptionPreferencesWrapper as SubscriptionPreferences } from './subscription/SubscriptionPreferencesWrapper';

export const novuComponents = {
  Inbox,
  InboxContent,
  Bell,
  Notifications: (props: Omit<InboxContentProps, 'hideNav' | 'initialPage'>) => {
    if (props.renderNotification) {
      const { renderBody, renderSubject, renderAvatar, renderDefaultActions, renderCustomActions, ...otherProps } =
        props;

      return <InboxContent {...otherProps} hideNav={true} initialPage={InboxPage.Notifications} />;
    }

    const { renderNotification, ...propsWithoutRenderNotification } = props;

    return <InboxContent {...propsWithoutRenderNotification} hideNav={true} initialPage={InboxPage.Notifications} />;
  },
  Preferences: (props: Omit<InboxContentProps, 'hideNav' | 'initialPage'>) => {
    if (props.renderNotification) {
      const { renderBody, renderSubject, renderAvatar, renderDefaultActions, renderCustomActions, ...otherProps } =
        props;

      return <InboxContent {...otherProps} hideNav={true} initialPage={InboxPage.Preferences} />;
    }

    const { renderNotification, ...propsWithoutRenderNotification } = props;

    return <InboxContent {...propsWithoutRenderNotification} hideNav={true} initialPage={InboxPage.Preferences} />;
  },
  Subscription,
  SubscriptionButton,
  SubscriptionPreferences,
  ConnectChat,
  SlackLinkUser,
  SlackConnectButton,
  MsTeamsLinkUser,
  MsTeamsConnectButton,
};

const SUBSCRIPTION_COMPONENTS = ['Subscription', 'SubscriptionButton', 'SubscriptionPreferences'];
const CHANNEL_COMPONENTS = [
  'ConnectChat',
  'SlackLinkUser',
  'SlackConnectButton',
  'MsTeamsLinkUser',
  'MsTeamsConnectButton',
];

export type NovuComponent = { name: NovuComponentName; props?: any };

export type NovuMounterProps = NovuComponent & { element: MountableElement };

export type NovuComponentName = keyof typeof novuComponents;

export type NovuComponentControls = {
  mount: (params: NovuMounterProps) => void;
  unmount: (params: { element: MountableElement }) => void;
  updateProps: (params: { element: MountableElement; props: unknown }) => void;
};

const InboxComponentsRenderer = (props: {
  elements: MountableElement[];
  nodes: Map<MountableElement, NovuComponent>;
}) => {
  return (
    <Show when={props.elements.length > 0}>
      <CountProvider>
        <For each={props.elements}>
          {(node) => {
            const novuComponent = () => props.nodes.get(node)!;
            let portalDivElement: HTMLDivElement;
            const Component = novuComponents[novuComponent().name];

            onMount(() => {
              /*
               ** return here if not `<Notifications /> or `<Preferences />`
               ** since we only want to override some styles for those to work properly
               ** due to the extra divs being introduced by the renderer/mounter
               */
              if (!['Notifications', 'Preferences', 'InboxContent'].includes(novuComponent().name)) return;

              if (node instanceof HTMLElement) {
                node.style.height = '100%';
              }
              if (portalDivElement) {
                portalDivElement.style.height = '100%';
              }
            });

            return (
              <Portal
                mount={node}
                ref={(el) => {
                  portalDivElement = el;
                }}
              >
                <Root>
                  <Component {...novuComponent().props} />
                </Root>
              </Portal>
            );
          }}
        </For>
      </CountProvider>
    </Show>
  );
};

const SimpleComponentsRenderer = (props: {
  elements: MountableElement[];
  nodes: Map<MountableElement, NovuComponent>;
}) => {
  return (
    <Show when={props.elements.length > 0}>
      <For each={props.elements}>
        {(node) => {
          const novuComponent = () => props.nodes.get(node)!;
          const Component = novuComponents[novuComponent().name];

          return (
            <Portal mount={node}>
              <Root>
                <Component {...novuComponent().props} />
              </Root>
            </Portal>
          );
        }}
      </For>
    </Show>
  );
};

type RendererProps = {
  novuUI: NovuUI;
  appearance?: AllAppearance;
  nodes: Map<MountableElement, NovuComponent>;
  localization?: AllLocalization;
  options: NovuOptions;
  tabs: Array<Tab>;
  preferencesFilter?: PreferencesFilter;
  preferenceGroups?: PreferenceGroups;
  preferencesSort?: PreferencesSort;
  routerPush?: RouterPush;
  novu?: Novu | Accessor<Novu | undefined>;
  container?: Node | null | undefined;
};

export const Renderer = (props: RendererProps) => {
  const inboxComponents = createMemo(() =>
    [...props.nodes.entries()]
      .filter(([_, node]) => !SUBSCRIPTION_COMPONENTS.includes(node.name) && !CHANNEL_COMPONENTS.includes(node.name))
      .map(([element, _]) => element)
  );
  const subscriptionComponents = createMemo(() =>
    [...props.nodes.entries()]
      .filter(([_, node]) => SUBSCRIPTION_COMPONENTS.includes(node.name))
      .map(([element, _]) => element)
  );
  const channelComponents = createMemo(() =>
    [...props.nodes.entries()]
      .filter(([_, node]) => CHANNEL_COMPONENTS.includes(node.name))
      .map(([element, _]) => element)
  );

  onMount(() => {
    const id = NOVU_DEFAULT_CSS_ID;
    const root = props.container instanceof ShadowRoot ? props.container : document;
    const el = root.getElementById(id);
    if (el) {
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = id;
    styleEl.innerHTML = css;

    const stylesContainer = props.container ?? document.head;
    stylesContainer.insertBefore(styleEl, stylesContainer.firstChild);

    onCleanup(() => {
      styleEl.remove();
    });
  });

  return (
    <NovuProvider options={props.options} novu={props.novu}>
      <LocalizationProvider localization={props.localization}>
        <AppearanceProvider id={props.novuUI.id} appearance={props.appearance} container={props.container}>
          <FocusManagerProvider>
            <InboxProvider
              applicationIdentifier={props.options?.applicationIdentifier}
              tabs={props.tabs}
              preferencesFilter={props.preferencesFilter}
              preferenceGroups={props.preferenceGroups}
              preferencesSort={props.preferencesSort}
              routerPush={props.routerPush}
            >
              <InboxComponentsRenderer elements={inboxComponents()} nodes={props.nodes} />
              <SimpleComponentsRenderer elements={subscriptionComponents()} nodes={props.nodes} />
              <SimpleComponentsRenderer elements={channelComponents()} nodes={props.nodes} />
            </InboxProvider>
          </FocusManagerProvider>
        </AppearanceProvider>
      </LocalizationProvider>
    </NovuProvider>
  );
};
