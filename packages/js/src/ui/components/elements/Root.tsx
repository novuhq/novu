import { splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { useAppearance } from '../../context';
import { cn, useStyle } from '../../helpers';

type RootProps = JSX.IntrinsicElements['div'];
export const Root = (props: RootProps) => {
  const [_, rest] = splitProps(props, ['class']);
  const { id } = useAppearance();
  const style = useStyle();

  return (
    <div id={`novu-root-${id}`} class={(style('root'), cn('novu', id, 'nt-text-foreground nt-h-full'))} {...rest} />
  );
};
