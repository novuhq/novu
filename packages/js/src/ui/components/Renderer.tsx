import { Component, createMemo, For, onMount, Show } from 'solid-js';
import { MountableElement, Portal } from 'solid-js/web';
import { NovuUI } from '..';
import {
  AppearanceProvider,
  CountProvider,
  FocusManagerProvider,
  InboxProvider,
  LocalizationProvider,
  NovuProvider,
} from '../context';
import type { CountsStore } from '../core/stores/counts';
import { ConnectChat } from './connect-chat/ConnectChat';
import { Bell, Root } from './elements';
import { Inbox, InboxContent, InboxContentProps, InboxPage } from './Inbox';
import { MsTeamsConnectButton } from './msteams-connect-button/MsTeamsConnectButton';
import { MsTeamsLinkUser } from './msteams-link-user/MsTeamsLinkUser';
import { NotificationCustomActions } from './Notification/NotificationCustomActions';
import { NotificationDefaultActions } from './Notification/NotificationDefaultActions';
import { TooltipGroupProvider } from './primitives/Tooltip';
import { SlackConnectButton } from './slack-connect-button/SlackConnectButton';
import { SlackLinkUser } from './slack-link-user/SlackLinkUser';
import { Subscription } from './subscription/Subscription';
import { SubscriptionButtonWrapper as SubscriptionButton } from './subscription/SubscriptionButtonWrapper';
import { SubscriptionPreferencesWrapper as SubscriptionPreferences } from './subscription/SubscriptionPreferencesWrapper';
import { TelegramConnectButton } from './telegram-connect-button/TelegramConnectButton';

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
  NotificationDefaultActions,
  NotificationCustomActions,
  Subscription,
  SubscriptionButton,
  SubscriptionPreferences,
  ConnectChat,
  SlackLinkUser,
  SlackConnectButton,
  MsTeamsLinkUser,
  MsTeamsConnectButton,
  TelegramConnectButton,
};

const SUBSCRIPTION_COMPONENTS = ['Subscription', 'SubscriptionButton', 'SubscriptionPreferences'];
const CHANNEL_COMPONENTS = [
  'ConnectChat',
  'SlackLinkUser',
  'SlackConnectButton',
  'MsTeamsLinkUser',
  'MsTeamsConnectButton',
  'TelegramConnectButton',
];

/** A mounted component. Its props stay opaque here: `mountComponent` typed them against the component on the way in. */
export type NovuComponent = { name: NovuComponentName; props?: unknown; bare?: boolean };

export type NovuMounterProps = NovuComponent & { element: MountableElement };

export type NovuComponentName = keyof typeof novuComponents;

export type NovuComponentControls = {
  mount: (params: NovuMounterProps) => void;
  unmount: (params: { element: MountableElement }) => void;
  updateProps: (params: { element: MountableElement; props: unknown }) => void;
};

/**
 * An island sits inside DOM that already belongs to an engine root, so neither the mount point nor Solid's
 * portal container may create a box, and the click boundary needs a marker to find.
 */
const applyIslandStyles = (node: MountableElement, portalDivElement?: HTMLDivElement) => {
  if (node instanceof HTMLElement) {
    node.setAttribute('data-novu-island', '');
    node.style.display = 'contents';
  }
  if (portalDivElement) {
    portalDivElement.style.display = 'contents';
  }
};

/** The one place that hands opaque mount props back to a component, so the signature is erased here and nowhere else. */
type MountableComponent = Component<Record<string, unknown>>;

const MountedComponent = (props: { component: NovuComponent }) => {
  const Mounted = novuComponents[props.component.name] as MountableComponent;
  const mountProps = () => (props.component.props ?? {}) as Record<string, unknown>;

  return (
    <Show when={!props.component.bare} fallback={<Mounted {...mountProps()} />}>
      <Root>
        <Mounted {...mountProps()} />
      </Root>
    </Show>
  );
};

/** `elements` is derived from `nodes`, so every rendered element has its entry; a miss is a renderer bug. */
const componentFor = (nodes: Map<MountableElement, NovuComponent>, node: MountableElement): NovuComponent => {
  const component = nodes.get(node);
  if (!component) {
    throw new Error('Novu: no component is registered for the mounted element');
  }

  return component;
};

const InboxComponentsRenderer = (props: {
  elements: MountableElement[];
  nodes: Map<MountableElement, NovuComponent>;
  counts: CountsStore;
}) => {
  return (
    <Show when={props.elements.length > 0}>
      <CountProvider store={props.counts}>
        <For each={props.elements}>
          {(node) => {
            const novuComponent = () => componentFor(props.nodes, node);
            let portalDivElement: HTMLDivElement | undefined;

            onMount(() => {
              const component = novuComponent();
              if (component.bare) {
                applyIslandStyles(node, portalDivElement);

                return;
              }

              /*
               ** return here if not `<Notifications /> or `<Preferences />`
               ** since we only want to override some styles for those to work properly
               ** due to the extra divs being introduced by the renderer/mounter
               */
              if (!['Notifications', 'Preferences', 'InboxContent'].includes(component.name)) return;

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
                <MountedComponent component={novuComponent()} />
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
          const novuComponent = () => componentFor(props.nodes, node);
          let portalDivElement: HTMLDivElement | undefined;

          onMount(() => {
            if (novuComponent().bare) {
              applyIslandStyles(node, portalDivElement);
            }
          });

          return (
            <Portal
              mount={node}
              ref={(el) => {
                portalDivElement = el;
              }}
            >
              <MountedComponent component={novuComponent()} />
            </Portal>
          );
        }}
      </For>
    </Show>
  );
};

type RendererProps = {
  novuUI: NovuUI;
  nodes: Map<MountableElement, NovuComponent>;
};

export const Renderer = (props: RendererProps) => {
  const { stores } = props.novuUI;
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

  return (
    <NovuProvider novu={stores.novu}>
      <LocalizationProvider store={stores.localization}>
        <AppearanceProvider store={stores.appearance}>
          <FocusManagerProvider>
            <TooltipGroupProvider>
              <InboxProvider store={stores.inbox}>
                <InboxComponentsRenderer elements={inboxComponents()} nodes={props.nodes} counts={stores.counts} />
                <SimpleComponentsRenderer elements={subscriptionComponents()} nodes={props.nodes} />
                <SimpleComponentsRenderer elements={channelComponents()} nodes={props.nodes} />
              </InboxProvider>
            </TooltipGroupProvider>
          </FocusManagerProvider>
        </AppearanceProvider>
      </LocalizationProvider>
    </NovuProvider>
  );
};
