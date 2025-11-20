// @ts-expect-error inline import esbuild syntax
import css from 'directcss:../index.directcss';
import { Accessor, For, Match, onCleanup, onMount, Switch } from 'solid-js';
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
import { Bell, Root } from './elements';
import { Inbox, InboxContent, InboxContentProps, InboxPage } from './Inbox';
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
};

const SUBSCRIPTION_COMPONENTS = ['Subscription', 'SubscriptionButton', 'SubscriptionPreferences'];

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
  const nodes = () => [...props.nodes.keys()];

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
              <For each={nodes()}>
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
                    <Switch
                      fallback={
                        <CountProvider>
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
                        </CountProvider>
                      }
                    >
                      <Match when={SUBSCRIPTION_COMPONENTS.includes(novuComponent().name)}>
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
                      </Match>
                    </Switch>
                  );
                }}
              </For>
            </InboxProvider>
          </FocusManagerProvider>
        </AppearanceProvider>
      </LocalizationProvider>
    </NovuProvider>
  );
};
