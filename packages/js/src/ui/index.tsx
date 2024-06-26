import { render } from 'solid-js/web';
import type { NovuOptions } from '../novu';
import { Appearance } from './context';
import './index.css';
import { Inbox } from './Inbox';
import { generateRandomString } from './helpers';

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
    }: {
      name?: string;
      options: NovuOptions;
      appearance?: Appearance;
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
      () => <Inbox name={name} id={this.#id} options={options} appearance={appearance} />,
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
