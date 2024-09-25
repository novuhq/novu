import { createEffect, JSX, onCleanup, splitProps } from 'solid-js';

type ExternalElementMounterProps = JSX.HTMLAttributes<HTMLDivElement> & {
  render: (el: HTMLDivElement) => () => void;
};

export const ExternalElementRenderer = (props: ExternalElementMounterProps) => {
  let ref: HTMLDivElement;
  const [local, rest] = splitProps(props, ['render']);

  createEffect(() => {
    const unmount = local.render(ref);

    onCleanup(() => {
      unmount();
    });
  });

  return (
    <div
      ref={(el) => {
        ref = el;
      }}
      {...rest}
    />
  );
};
