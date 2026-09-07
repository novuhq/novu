import { Accessor, ComponentProps, createSignal, Setter } from 'solid-js';
import { MountableElement, render } from 'solid-js/web';
import { Novu } from '../novu';
import type { NovuOptions } from '../types';
import { NovuComponent, NovuComponentName, novuComponents, Renderer } from './components/Renderer';
import { generateRandomString } from './helpers';
import type {
  AllAppearance,
  AllLocalization,
  BaseNovuProviderProps,
  NovuProviderProps,
  PreferenceGroups,
  PreferencesFilter,
  PreferencesSort,
  RouterPush,
  Tab,
} from './types';

export type NovuUIOptions = NovuProviderProps;
export type BaseNovuUIOptions = BaseNovuProviderProps;
export class NovuUI {
  #dispose: (() => void) | null = null;
  #container: Accessor<Node | null | undefined>;
  #setContainer: Setter<Node | null | undefined>;
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
  #preferenceGroups: Accessor<PreferenceGroups | undefined>;
  #setPreferenceGroups: Setter<PreferenceGroups | undefined>;
  #preferencesSort: Accessor<PreferencesSort | undefined>;
  #setPreferencesSort: Setter<PreferencesSort | undefined>;
  #novu: Accessor<Novu | undefined>;
  #setNovu: Setter<Novu | undefined>;
  id: string;

  constructor(props: NovuProviderProps) {
    this.id = generateRandomString(16);
    const [appearance, setAppearance] = createSignal(props.appearance);
    const [localization, setLocalization] = createSignal(props.localization);
    const [options, setOptions] = createSignal(props.options);
    const [mountedElements, setMountedElements] = createSignal(new Map<MountableElement, NovuComponent>());
    const [tabs, setTabs] = createSignal(props.tabs ?? []);
    const [preferencesFilter, setPreferencesFilter] = createSignal(props.preferencesFilter);
    const [preferenceGroups, setPreferenceGroups] = createSignal(props.preferenceGroups);
    const [preferencesSort, setPreferencesSort] = createSignal(props.preferencesSort);
    const [routerPush, setRouterPush] = createSignal(props.routerPush);
    const [container, setContainer] = createSignal(this.#getContainerElement(props.container));
    const [novu, setNovu] = createSignal(props.novu);
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
    this.#novu = novu;
    this.#setNovu = setNovu;
    this.#preferencesFilter = preferencesFilter;
    this.#setPreferencesFilter = setPreferencesFilter;
    this.#preferenceGroups = preferenceGroups;
    this.#setPreferenceGroups = setPreferenceGroups;
    this.#preferencesSort = preferencesSort;
    this.#setPreferencesSort = setPreferencesSort;
    this.#container = container;
    this.#setContainer = setContainer;

    this.#mountComponentRenderer();
  }

  #getContainerElement(container?: Node | string | null): Node | null | undefined {
    if (container === null || container === undefined) {
      return container;
    }

    if (typeof container === 'string') {
      return document.querySelector(container) ?? document.getElementById(container);
    }

    return container;
  }

  #mountComponentRenderer(): void {
    if (this.#dispose !== null) {
      return;
    }

    this.#rootElement = document.createElement('div');
    this.#rootElement.setAttribute('id', `novu-ui-${this.id}`);

    const container = this.#container();
    (container ?? document.body).appendChild(this.#rootElement);

    const dispose = render(
      () => (
        <Renderer
          novuUI={this}
          nodes={this.#mountedElements()}
          options={this.#options()}
          appearance={this.#appearance()}
          localization={this.#localization()}
          tabs={this.#tabs()}
          preferencesFilter={this.#preferencesFilter()}
          preferenceGroups={this.#preferenceGroups()}
          preferencesSort={this.#preferencesSort()}
          routerPush={this.#routerPush()}
          novu={this.#novu}
          container={this.#container()}
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

  updateNovu(novu: Novu) {
    this.#setNovu(novu);
  }

  updateAppearance(appearance?: AllAppearance) {
    this.#setAppearance(appearance);
  }

  updateLocalization(localization?: AllLocalization) {
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

  updatePreferenceGroups(preferenceGroups?: PreferenceGroups) {
    this.#setPreferenceGroups(preferenceGroups);
  }

  updatePreferencesSort(preferencesSort?: PreferencesSort) {
    this.#setPreferencesSort(() => preferencesSort);
  }

  updateRouterPush(routerPush?: RouterPush) {
    this.#setRouterPush(() => routerPush);
  }

  updateContainer(container?: Node | string | null) {
    this.#setContainer(this.#getContainerElement(container));
  }

  unmount(): void {
    this.#dispose?.();
    this.#dispose = null;
    this.#rootElement?.remove();
  }
}
