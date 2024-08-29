import { onCleanup, createEffect, ParentProps } from 'solid-js';

type ExternalElementMounterProps = ParentProps<{
  render: (el: HTMLDivElement) => () => void;
}>;

export const ExternalElementRenderer = ({ render, ...rest }: ExternalElementMounterProps) => {
  let ref: HTMLDivElement;

  createEffect(() => {
    const unmount = render(ref);

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
