import { For, onCleanup, onMount } from 'solid-js';
import { MountableElement, Portal } from 'solid-js/web';
import { NovuUI } from '..';
import type { NovuOptions } from '../../types';
import {
  AppearanceProvider,
  CountProvider,
  FocusManagerProvider,
  InboxProvider,
  LocalizationProvider,
  NovuProvider,
} from '../context';
import type { Appearance, Localization, Tab } from '../types';
import { Bell, Root } from './elements';
import { Inbox, InboxContent, InboxContentProps, InboxPage } from './Inbox';

export const novuComponents = {
  Inbox,
  // InboxContent, //enable this to also allow the whole inbox content as a component
  Bell,
  Notifications: (props: Omit<InboxContentProps, 'hideNav' | 'initialPage'>) => (
    <InboxContent {...props} hideNav={true} initialPage={InboxPage.Notifications} />
  ),
  Preferences: (props: Omit<InboxContentProps, 'hideNav' | 'initialPage'>) => (
    <InboxContent {...props} hideNav={true} initialPage={InboxPage.Preferences} />
  ),
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
  cssHref: string;
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

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = props.cssHref;
    document.head.insertBefore(link, document.head.firstChild);

    onCleanup(() => {
      const element = document.getElementById(id);
      element?.remove();
    });
  });

  return (
    <NovuProvider options={props.options}>
      <LocalizationProvider localization={props.localization}>
        <AppearanceProvider id={props.novuUI.id} appearance={props.appearance}>
          <FocusManagerProvider>
            <InboxProvider tabs={props.tabs}>
              <CountProvider>
                <For each={[...props.nodes]}>
                  {([node, component]) => {
                    let portalDivElement: HTMLDivElement;
                    const Component = novuComponents[component.name];

                    onMount(() => {
                      if (!['Notifications', 'Preferences'].includes(component.name)) return;

                      if (node instanceof HTMLElement) {
                        node.classList.add('nt-h-full');
                      }
                      portalDivElement.classList.add('nt-h-full');
                    });

                    return (
                      <Portal
                        mount={node}
                        ref={(el) => {
                          portalDivElement = el;
                        }}
                      >
                        <Root>
                          <Component {...component.props} />
                        </Root>
                      </Portal>
                    );
                  }}
                </For>
              </CountProvider>
            </InboxProvider>
          </FocusManagerProvider>
        </AppearanceProvider>
      </LocalizationProvider>
    </NovuProvider>
  );
};
