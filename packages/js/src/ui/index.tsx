import { MountableElement, render } from 'solid-js/web';
import type { NovuOptions } from '../novu';
import { Appearance } from './context';
import './index.css';
import { generateRandomString } from './helpers';
import { Localization } from './context/LocalizationContext';
import { NovuComponent, NovuComponentControls, NovuComponentName, Renderer } from './components/Renderer';
import { NovuProviderProps } from './types';
import { createSignal } from 'solid-js';

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
  id: string;

  constructor(props: NovuProviderProps) {
    this.id = generateRandomString(16);
    const [appearance, setAppearance] = createSignal(props.appearance);
    const [localization, setLocalization] = createSignal(props.localization);
    const [options, setOptions] = createSignal(props.options);
    const [mountedElements, setMountedElements] = createSignal(new Map<MountableElement, NovuComponent>());
    this.#mountedElements = mountedElements;
    this.#setMountedElements = setMountedElements;
    this.#appearance = appearance;
    this.#setAppearance = setAppearance;
    this.#localization = localization;
    this.#setLocalization = setLocalization;
    this.#options = options;
    this.#setOptions = setOptions;

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
          novuUI={this}
          nodes={this.#mountedElements()}
          options={this.#options()}
          appearance={this.#appearance()}
          localization={this.#localization()}
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

  #mountComponent({
    name,
    element,
    props: componentProps,
  }: {
    name: NovuComponentName;
    element: MountableElement;
    props?: unknown;
  }) {
    this.#setMountedElements((oldNodes) => {
      const newNodes = new Map(oldNodes);
      newNodes.set(element, { name, props: componentProps });

      return newNodes;
    });
  }

  //All in one <Inbox />
  mountInbox(element: MountableElement) {
    this.#mountComponent({ name: 'Inbox', element });
  }

  unmountComponent(element: MountableElement) {
    this.#setMountedElements((oldNodes) => {
      const newNodes = new Map(oldNodes);
      newNodes.delete(element);

      return newNodes;
    });
  }

  updateComponentProps({ element, props }: { element: MountableElement; props: unknown }) {
    this.#setMountedElements((oldNodes) => {
      const newNodes = new Map(oldNodes);
      const node = newNodes.get(element);
      if (node) {
        newNodes.set(element, { ...node, props });
      }

      return newNodes;
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
}
