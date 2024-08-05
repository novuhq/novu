import { Accessor, ComponentProps, createSignal } from 'solid-js';
import { MountableElement, render } from 'solid-js/web';
import type { NovuOptions } from '../novu';
import { NovuComponent, NovuComponentName, novuComponents, Renderer } from './components/Renderer';
import { Appearance } from './context';
import { Localization } from './context/LocalizationContext';
import { generateRandomString } from './helpers';
import type { BaseNovuProviderProps, NovuProviderProps, Tab } from './types';
//@ts-expect-error inline import esbuild syntax
import css from 'directcss:./index.directcss';
import { InboxProps } from './components';

export type NovuUIOptions = NovuProviderProps;
export type BaseNovuUIOptions = BaseNovuProviderProps;
export class NovuUI {
  #dispose: { (): void } | null = null;
  #rootElement: HTMLElement;
  #mountedElements;
  #setMountedElements;
  #appearance;
  #setAppearance;
  #localization;
  #setLocalization;
  #options;
  #setOptions;
  #tabs: Accessor<Array<Tab>>;
  #setTabs;
  id: string;

  constructor(props: NovuProviderProps) {
    this.id = generateRandomString(16);
    const [appearance, setAppearance] = createSignal(props.appearance);
    const [localization, setLocalization] = createSignal(props.localization);
    const [options, setOptions] = createSignal(props.options);
    const [mountedElements, setMountedElements] = createSignal(new Map<MountableElement, NovuComponent>());
    const [tabs, setTabs] = createSignal(props.tabs ?? []);
    this.#mountedElements = mountedElements;
    this.#setMountedElements = setMountedElements;
    this.#appearance = appearance;
    this.#setAppearance = setAppearance;
    this.#localization = localization;
    this.#setLocalization = setLocalization;
    this.#options = options;
    this.#setOptions = setOptions;
    this.#tabs = tabs;
    this.#setTabs = setTabs;

    this.#mountComponentRenderer();
  }

  #mountComponentRenderer(): void {
    if (this.#dispose !== null) {
      return;
    }

    this.#rootElement = document.createElement('div');
    this.#rootElement.setAttribute('id', `novu-ui-${this.id}`);
    document.body.appendChild(this.#rootElement);

    const dispose = render(
      () => (
        <Renderer
          defaultCss={css}
          novuUI={this}
          nodes={this.#mountedElements()}
          options={this.#options()}
          appearance={this.#appearance()}
          localization={this.#localization()}
          tabs={this.#tabs()}
        />
      ),
      this.#rootElement
    );

    this.#dispose = dispose;
  }

  #unmountComponentRenderer(): void {
    this.#dispose?.();
    this.#dispose = null;
    this.#rootElement?.remove();
  }

  #updateComponentProps(element: MountableElement, props: unknown) {
    this.#setMountedElements((oldMountedElements) => {
      const newMountedElements = new Map(oldMountedElements);
      const mountedElement = newMountedElements.get(element);
      if (mountedElement) {
        newMountedElements.set(element, { ...mountedElement, props });
      }

      return newMountedElements;
    });
  }

  mountComponent<T extends NovuComponentName>({
    name,
    element,
    props: componentProps,
  }: {
    name: T;
    element: MountableElement;
    props?: ComponentProps<(typeof novuComponents)[T]>;
  }) {
    if (this.#mountedElements().has(element)) {
      return this.#updateComponentProps(element, componentProps);
    }

    this.#setMountedElements((oldNodes) => {
      const newNodes = new Map(oldNodes);
      newNodes.set(element, { name, props: componentProps });

      return newNodes;
    });
  }

  //All in one <Inbox />
  mountInbox(element: MountableElement, props?: InboxProps) {
    this.mountComponent({ name: 'Inbox', element, props });
  }

  unmountComponent(element: MountableElement) {
    this.#setMountedElements((oldMountedElements) => {
      const newMountedElements = new Map(oldMountedElements);
      newMountedElements.delete(element);

      return newMountedElements;
    });
  }

  updateAppearance(appearance: Appearance) {
    this.#setAppearance(appearance);
  }

  updateLocalization(localization: Localization) {
    this.#setLocalization(localization);
  }

  updateOptions(options: NovuOptions) {
    this.#setOptions(options);
  }

  updateTabs(tabs: Array<Tab>) {
    this.#setTabs(tabs);
  }
}
