import { render } from 'solid-js/web';

import App from './App';

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

    const dispose = render(() => <App name={name} options={options} />, root);

    this.#dispose = dispose;
  }

  unmount(): void {
    this.#dispose?.();
    this.#dispose = null;
  }
}
