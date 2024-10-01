import { Show, splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { useAppearance, useInboxContext } from '../../context';
import { cn, useStyle } from '../../helpers';

type RootProps = JSX.IntrinsicElements['div'];
export const Root = (props: RootProps) => {
  const [_, rest] = splitProps(props, ['class']);
  const { id } = useAppearance();
  const style = useStyle();
  const { hideBranding } = useInboxContext();

  return (
    <>
      <Show when={!hideBranding()}>{new Comment(' Powered by Novu - https://novu.co ')}</Show>
      <div
        id={`novu-root-${id()}`}
        class={(style('root'), cn('novu', id(), 'nt-text-foreground nt-h-full'))}
        {...rest}
      />
    </>
  );
};
