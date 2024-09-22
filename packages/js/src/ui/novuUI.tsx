import { Accessor, Setter, ComponentProps, createSignal } from 'solid-js';
import { MountableElement, render } from 'solid-js/web';
import type { NovuOptions } from '../types';
import { NovuComponent, NovuComponentName, novuComponents, Renderer } from './components/Renderer';
import { generateRandomString } from './helpers';
import type {
  Appearance,
  BaseNovuProviderProps,
  Localization,
  NovuProviderProps,
  PreferencesFilter,
  RouterPush,
  Tab,
} from './types';

// @ts-ignore
const isDev = __DEV__;

// @ts-ignore
const version = PACKAGE_VERSION;
const cssHref = isDev
  ? 'http://localhost:4010/index.css'
  : `https://cdn.jsdelivr.net/npm/@novu/js@${version}/dist/index.css`;

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
  #routerPush: Accessor<RouterPush | undefined>;
  #setRouterPush: Setter<RouterPush | undefined>;
  #preferencesFilter: Accessor<PreferencesFilter | undefined>;
  #setPreferencesFilter: Setter<PreferencesFilter | undefined>;
  #predefinedNovu;
  id: string;

  constructor(props: NovuProviderProps) {
    this.id = generateRandomString(16);
    const [appearance, setAppearance] = createSignal(props.appearance);
    const [localization, setLocalization] = createSignal(props.localization);
    const [options, setOptions] = createSignal(props.options);
    const [mountedElements, setMountedElements] = createSignal(new Map<MountableElement, NovuComponent>());
    const [tabs, setTabs] = createSignal(props.tabs ?? []);
    const [preferencesFilter, setPreferencesFilter] = createSignal(props.preferencesFilter);
    const [routerPush, setRouterPush] = createSignal(props.routerPush);
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
    this.#routerPush = routerPush;
    this.#setRouterPush = setRouterPush;
    this.#predefinedNovu = props.novu;
    this.#preferencesFilter = preferencesFilter;
    this.#setPreferencesFilter = setPreferencesFilter;

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
          cssHref={cssHref}
          novuUI={this}
          nodes={this.#mountedElements()}
          options={this.#options()}
          appearance={this.#appearance()}
          localization={this.#localization()}
          tabs={this.#tabs()}
          preferencesFilter={this.#preferencesFilter()}
          routerPush={this.#routerPush()}
          novu={this.#predefinedNovu}
        />
      ),
      this.#rootElement
    );

    this.#dispose = dispose;
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

  unmountComponent(element: MountableElement) {
    this.#setMountedElements((oldMountedElements) => {
      const newMountedElements = new Map(oldMountedElements);
      newMountedElements.delete(element);

      return newMountedElements;
    });
  }

  updateAppearance(appearance?: Appearance) {
    this.#setAppearance(appearance);
  }

  updateLocalization(localization?: Localization) {
    this.#setLocalization(localization);
  }

  updateOptions(options: NovuOptions) {
    this.#setOptions(options);
  }

  updateTabs(tabs?: Array<Tab>) {
    this.#setTabs(tabs ?? []);
  }

  updatePreferencesFilter(preferencesFilter?: PreferencesFilter) {
    this.#setPreferencesFilter(preferencesFilter);
  }

  updateRouterPush(routerPush?: RouterPush) {
    this.#setRouterPush(() => routerPush);
  }

  unmount(): void {
    this.#dispose?.();
    this.#dispose = null;
    this.#rootElement?.remove();
  }
}
