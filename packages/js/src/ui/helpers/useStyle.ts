import { createMemo, createSignal, onMount } from 'solid-js';
import { AppearanceKey, appearanceKeys, Elements, useAppearance } from '../context';
import { cn } from './utils';

export const useStyle = () => {
  const appearance = useAppearance();
  const [isServer, setIsServer] = createSignal(true);

  onMount(() => {
    setIsServer(false);
  });

  const styleFuncMemo = createMemo(() => (appearanceKey: AppearanceKey, className?: string) => {
    const appearanceKeyParts = appearanceKey.split('__');
    const finalAppearanceKeys: (keyof Elements)[] = [];
    for (let i = 0; i < appearanceKeyParts.length; i++) {
      const accumulated = appearanceKeyParts.slice(i).join('__');
      if (appearanceKeys.includes(accumulated as keyof Elements)) {
        finalAppearanceKeys.push(accumulated as keyof Elements);
      }
    }
    //Have keys with least amount of `__` first, i.e. have  `bar foo__bar` in the DOM.
    finalAppearanceKeys.sort((a, b) => {
      const countA = (a.match(/__/g) || []).length;
      const countB = (b.match(/__/g) || []).length;

      return countA - countB;
    });

    const appearanceClassnames = [];
    for (let i = 0; i < finalAppearanceKeys.length; i++) {
      if (typeof appearance.elements?.[finalAppearanceKeys[i]] === 'string') {
        appearanceClassnames.push(appearance.elements?.[finalAppearanceKeys[i]]);
      }
    }

    const cssInJsClasses =
      !!finalAppearanceKeys.length && !isServer()
        ? finalAppearanceKeys.map((appKey) => appearance.appearanceKeyToCssInJsClass[appKey])
        : [];

    return cn(
      ...finalAppearanceKeys.map((key) => `nv-${key}`),
      className, // default styles
      appearanceClassnames, // overrides via appearance prop classes
      ...cssInJsClasses
    );
  });

  return styleFuncMemo();
};
