import { createMemo, createSignal, onMount } from 'solid-js';
import { Elements, useAppearance } from '../context';
import { cn } from './utils';

export const useStyle = () => {
  const appearance = useAppearance();
  const [isServer, setIsServer] = createSignal(true);

  onMount(() => {
    setIsServer(false);
  });

  const styleFuncMemo = createMemo(() => (className: string, descriptor?: keyof Elements | (keyof Elements)[]) => {
    const appearanceClassname =
      typeof descriptor === 'string' && typeof appearance.elements?.[descriptor] === 'string'
        ? (appearance.elements?.[descriptor] as string) || ''
        : '';

    const descriptors = (Array.isArray(descriptor) ? descriptor : [descriptor]).map((desc) => `nv-${desc}`);
    const cssInJsClasses =
      !!descriptors.length && !isServer() ? descriptors.map((des) => appearance.descriptorToCssInJsClass[des]) : [];

    return cn(
      ...descriptors,
      className, // default styles
      appearanceClassname, // overrides via appearance prop classes
      ...cssInJsClasses
    );
  });

  return styleFuncMemo();
};
