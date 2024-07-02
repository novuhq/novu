import { render } from 'solid-js/web';
import type { NovuOptions } from '../novu';
import { Appearance } from './context';
import './index.css';
import { Inbox } from './Inbox';
import { generateRandomString } from './helpers';
import { Localization } from './context/LocalizationContext';

export class InboxUI {
  #dispose: { (): void } | null = null;
  #rootElement: HTMLElement;
  #id: string;

  constructor() {
    this.#id = generateRandomString(16);
  }

  mount(
    el: HTMLElement,
    {
      name = 'novu',
      options,
      appearance,
      localization,
    }: {
      name?: string;
      options: NovuOptions;
      appearance?: Appearance;
      localization?: Localization;
    }
  ): void {
    if (this.#dispose !== null) {
      return;
    }

    this.#rootElement = document.createElement('div');
    this.#rootElement.setAttribute('id', 'novu-ui');
    this.#rootElement.setAttribute('class', this.#id);
    el.appendChild(this.#rootElement);

    const dispose = render(
      () => <Inbox id={this.#id} name={name} options={options} appearance={appearance} localization={localization} />,
      this.#rootElement
    );

    this.#dispose = dispose;
  }

  unmount(): void {
    this.#dispose?.();
    this.#dispose = null;
    this.#rootElement?.remove();
  }
}
