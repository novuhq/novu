import { createMemo, createSignal, onMount } from 'solid-js';
import { Elements, useAppearance } from '../context';
import { cn } from './utils';

export const useStyle = () => {
  const appearance = useAppearance();
  const [isServer, setIsServer] = createSignal(true);

  onMount(() => {
    setIsServer(false);
  });

  const styleFuncMemo = createMemo(() => (appearanceKey: keyof Elements | (keyof Elements)[], className?: string) => {
    const appearanceClassname =
      typeof appearanceKey === 'string' && typeof appearance.elements?.[appearanceKey] === 'string'
        ? (appearance.elements?.[appearanceKey] as string) || ''
        : '';

    const appearanceKeys = (Array.isArray(appearanceKey) ? appearanceKey : [appearanceKey]).map((desc) => `nv-${desc}`);
    const cssInJsClasses =
      !!appearanceKeys.length && !isServer()
        ? appearanceKeys.map((appKey) => appearance.appearanceKeyToCssInJsClass[appKey])
        : [];

    return cn(
      ...appearanceKeys,
      className, // default styles
      appearanceClassname, // overrides via appearance prop classes
      ...cssInJsClasses
    );
  });

  return styleFuncMemo();
};
