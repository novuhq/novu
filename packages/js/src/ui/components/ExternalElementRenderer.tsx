import { createEffect, JSX, onCleanup, splitProps, untrack } from 'solid-js';
import { generateRandomString } from '../helpers/utils';
import type { OutletCleanup, OutletHandle } from '../types';

type ExternalElementRendererProps<TArgs extends unknown[]> = Omit<JSX.HTMLAttributes<HTMLDivElement>, 'style'> & {
  /** The host-supplied renderer. A change of identity unmounts the outlet and mounts it again. */
  render: (el: HTMLDivElement, ...args: TArgs) => OutletCleanup<TArgs>;
  /** The data handed to the renderer. A change is pushed through the handle's `update` when the host provides one. */
  args: TArgs;
};

const toHandle = <TArgs extends unknown[]>(cleanup: OutletCleanup<TArgs>): OutletHandle<TArgs> =>
  typeof cleanup === 'function' ? { unmount: cleanup } : cleanup;

/**
 * An outlet: a DOM node the engine hands to the host so the host can render its own content into it.
 *
 * The outlet is mounted once. Later data changes reach the host through `update` when its renderer returned an
 * {@link OutletHandle}; a renderer that returned a bare cleanup function is unmounted and mounted again instead.
 */
export const ExternalElementRenderer = <TArgs extends unknown[]>(props: ExternalElementRendererProps<TArgs>) => {
  let ref!: HTMLDivElement;
  const [local, rest] = splitProps(props, ['render', 'args']);
  const outletId = `nv-outlet-${generateRandomString(8)}`;
  let handle: OutletHandle<TArgs> | undefined;
  let mountedRender: ExternalElementRendererProps<TArgs>['render'] | undefined;

  const unmount = () => {
    handle?.unmount();
    handle = undefined;
    mountedRender = undefined;
  };

  createEffect(() => {
    const render = local.render;
    const args = local.args;

    untrack(() => {
      if (handle?.update && mountedRender === render) {
        handle.update(...args);

        return;
      }

      unmount();
      handle = toHandle(render(ref, ...args));
      mountedRender = render;
    });
  });

  onCleanup(unmount);

  return (
    <div
      ref={(el) => {
        ref = el;
      }}
      data-novu-outlet={outletId}
      style={{ display: 'contents' }}
      {...rest}
    />
  );
};
