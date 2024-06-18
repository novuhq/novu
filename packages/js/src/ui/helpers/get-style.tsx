import { createMemo, createSignal, onMount } from 'solid-js';
import { CSSProperties, Elements, useAppearance } from '../context';
import { cn } from './utils';

export const getStyle = () => {
  const appearance = useAppearance();
  const [isServer, setIsServer] = createSignal(true);

  onMount(() => {
    setIsServer(false);
  });

  const styleFuncMemo = createMemo(() => (className: string, descriptor?: keyof Elements) => {
    const appearanceClassname =
      descriptor && typeof appearance.elements?.[descriptor] === 'string'
        ? (appearance.elements?.[descriptor] as string) || ''
        : '';

    return cn(
      descriptor ? `nv-${descriptor}` : '', // this is the targetable classname for customers
      className, // default styles
      appearanceClassname, // overrides via appearance prop classes
      descriptor && !isServer() ? appearance.descriptorToCssInJsClass[descriptor] : ''
    );
  });

  return styleFuncMemo();
};
