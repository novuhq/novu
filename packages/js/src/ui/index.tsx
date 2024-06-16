import { render } from 'solid-js/web';

import Inbox from './Inbox';

export class UI {
  #dispose: { (): void } | null = null;

  mount(
    el: HTMLElement,
    {
      name = 'novu',
      options,
    }: {
      name?: string;
      options: {
        applicationIdentifier: string;
        subscriberId: string;
      };
    }
  ): void {
    if (this.#dispose !== null) {
      return;
    }

    const root = document.createElement('div');
    root.setAttribute('id', 'novu-ui');
    el.appendChild(root);

    const dispose = render(() => <Inbox name={name} options={options} />, root);

    this.#dispose = dispose;
  }

  unmount(): void {
    this.#dispose?.();
    this.#dispose = null;
  }
}
