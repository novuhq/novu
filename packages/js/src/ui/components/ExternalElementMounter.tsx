import { createEffect, onCleanup, ParentProps } from 'solid-js';

type ExternalElementMounterProps = ParentProps<{
  mount: (el: HTMLDivElement) => () => void;
}>;

export const ExternalElementMounter = ({ mount, ...rest }: ExternalElementMounterProps) => {
  let ref: HTMLDivElement;

  createEffect(() => {
    const unmount = mount(ref);

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
