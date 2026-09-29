// @ts-expect-error inline import esbuild syntax
import css from 'directcss:./index.directcss';
import { Accessor, ComponentProps, createMemo, createRoot, createSignal, Setter } from 'solid-js';
import { MountableElement, render } from 'solid-js/web';
import { Novu } from '../novu';
import type { NovuOptions } from '../types';
import { NovuComponent, NovuComponentName, novuComponents, Renderer } from './components/Renderer';
import { type AppearanceStore, createAppearanceStore } from './core/stores/appearance';
import { type CountsStore, createCountsStore } from './core/stores/counts';
import { createInboxStore, type InboxStore } from './core/stores/inbox';
import { createLocalizationStore, type LocalizationStore } from './core/stores/localization';
import { generateRandomString } from './core/style/cn';
import type {
  AllAppearance,
  AllLocalization,
  BaseNovuProviderProps,
  MountHandle,
  NovuProviderProps,
  PreferenceGroups,
  PreferencesFilter,
  PreferencesSort,
  RouterPush,
  Tab,
} from './types';

export type NovuUIOptions = NovuProviderProps;
export type BaseNovuUIOptions = BaseNovuProviderProps;

/** The core state of one engine instance. Every renderer, the Solid engine and host-native blocks alike, reads it. */
export type EngineStores = {
  novu: Accessor<Novu>;
  appearance: AppearanceStore;
  localization: LocalizationStore;
  inbox: InboxStore;
  counts: CountsStore;
};

export class NovuUI {
  #dispose: (() => void) | null = null;
  #disposeStores: () => void = () => {};
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
  readonly stores: EngineStores;

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

    this.stores = this.#createStores();
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

  /** The stores live in their own reactive root, owned by this instance and disposed with it. */
  #createStores(): EngineStores {
    return createRoot((dispose) => {
      this.#disposeStores = dispose;

      const novu = createMemo(() => this.#novu() ?? new Novu(this.#options()));
      const appearance = createAppearanceStore({
        id: this.id,
        appearance: this.#appearance,
        container: this.#container,
        defaultCss: css,
      });
      const localization = createLocalizationStore(this.#localization);
      const inbox = createInboxStore({
        novu,
        tabs: this.#tabs,
        preferencesFilter: this.#preferencesFilter,
        preferenceGroups: this.#preferenceGroups,
        preferencesSort: this.#preferencesSort,
        routerPush: this.#routerPush,
        applicationIdentifier: () => this.#options()?.applicationIdentifier,
      });
      const counts = createCountsStore({ novu, inbox });

      return { novu, appearance, localization, inbox, counts };
    });
  }

  #mountComponentRenderer(): void {
    if (this.#dispose !== null) {
      return;
    }

    this.#rootElement = document.createElement('div');
    this.#rootElement.setAttribute('id', `novu-ui-${this.id}`);

    const container = this.#container();
    (container ?? document.body).appendChild(this.#rootElement);

    const dispose = render(() => <Renderer novuUI={this} nodes={this.#mountedElements()} />, this.#rootElement);

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

  /**
   * Renders a component into a mount point owned by the host.
   *
   * Calling it again for the same element updates the props. The returned handle does the same without a second
   * lookup and removes the component when the host is done with it.
   *
   * `bare` skips the `Root` wrapper: use it for islands, mount points that already sit inside an engine root.
   */
  mountComponent<T extends NovuComponentName>({
    name,
    element,
    props: componentProps,
    bare,
  }: {
    name: T;
    element: MountableElement;
    props?: ComponentProps<(typeof novuComponents)[T]>;
    bare?: boolean;
  }): MountHandle<ComponentProps<(typeof novuComponents)[T]> | undefined> {
    if (this.#mountedElements().has(element)) {
      this.#updateComponentProps(element, componentProps);
    } else {
      this.#setMountedElements((oldNodes) => {
        const newNodes = new Map(oldNodes);
        newNodes.set(element, { name, props: componentProps, bare });

        return newNodes;
      });
    }

    return {
      update: (props) => this.#updateComponentProps(element, props),
      unmount: () => this.unmountComponent(element),
    };
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
    this.#disposeStores();
  }
}
