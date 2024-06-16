import { render } from 'solid-js/web';
import Inbox from './Inbox';
import type { NovuOptions } from '../novu';

export class InboxUI {
  #dispose: { (): void } | null = null;
  #rootElement: HTMLElement;

  mount(
    el: HTMLElement,
    {
      name = 'novu',
      options,
    }: {
      name?: string;
      options: NovuOptions;
    }
  ): void {
    if (this.#dispose !== null) {
      return;
    }

    this.#rootElement = document.createElement('div');
    this.#rootElement.setAttribute('id', 'novu-ui');
    el.appendChild(this.#rootElement);

    const dispose = render(() => <Inbox name={name} options={options} />, this.#rootElement);

    this.#dispose = dispose;
  }

  unmount(): void {
    this.#dispose?.();
    this.#dispose = null;
    this.#rootElement.remove();
  }
}
