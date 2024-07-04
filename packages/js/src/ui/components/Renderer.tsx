import { createMemo, createRenderEffect, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { MountableElement, Portal } from 'solid-js/web';
import { NovuUI } from '..';
import { Novu, NovuOptions } from '../../novu';
import { Appearance, AppearanceProvider, Localization, LocalizationProvider, NovuProvider } from '../context';
import { Bell } from './Bell';
import { Inbox } from './Inbox';

const NovuComponents = {
  Inbox,
  Bell,
};

export type NovuComponent = { name: NovuComponentName; props?: unknown };

export type NovuMounterProps = NovuComponent & { element: MountableElement };

export type NovuComponentName = keyof typeof NovuComponents;

export type NovuComponentControls = {
  mount: (params: NovuMounterProps) => void;
  unmount: (params: { element: MountableElement }) => void;
  updateProps: (params: { element: MountableElement; props: unknown }) => void;
};

type RendererProps = {
  novuUI: NovuUI;
  appearance?: Appearance;
  nodes: Map<MountableElement, NovuComponent>;
  localization?: Localization;
  options: NovuOptions;
};

export const Renderer = (props: RendererProps) => {
  return (
    <NovuProvider options={props.options}>
      <LocalizationProvider localization={props.localization}>
        <AppearanceProvider id={props.novuUI.id} appearance={props.appearance}>
          {[...props.nodes].map(([node, component]) => (
            //@ts-expect-error props not typed
            <Portal mount={node}>{NovuComponents[component.name](component.props)}</Portal>
          ))}
        </AppearanceProvider>
      </LocalizationProvider>
    </NovuProvider>
  );
};
