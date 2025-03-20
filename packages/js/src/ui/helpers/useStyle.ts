import { createMemo, createSignal, onMount } from 'solid-js';
import { appearanceKeys } from '../config';
import { useAppearance } from '../context';
import type { AppearanceKey, Elements } from '../types';
import { cn, publicFacingTwMerge } from './utils';

export const useStyle = () => {
  const appearance = useAppearance();
  const [isServer, setIsServer] = createSignal(true);

  onMount(() => {
    setIsServer(false);
  });

  const styleFuncMemo = createMemo(() => (appearanceKey: AppearanceKey, className?: string) => {
    const appearanceKeyParts = appearanceKey.split('__');
    let finalAppearanceKeys: (keyof Elements)[] = [];
    for (let i = 0; i < appearanceKeyParts.length; i += 1) {
      const accumulated = appearanceKeyParts.slice(i).join('__');
      if (appearanceKeys.includes(accumulated as keyof Elements)) {
        finalAppearanceKeys.push(accumulated as keyof Elements);
      }
    }

    // Find appearance keys in the className and utilize them as well.
    const classes = className?.split(/\s+/).map((className) => className.replace(/^nv-/, '')) || [];
    const appearanceKeysInClasses = classes.filter((className) =>
      (appearanceKeys as unknown as string[]).includes(className)
    );

    // Remove duplicates
    finalAppearanceKeys = Array.from(
      new Set([...finalAppearanceKeys, ...appearanceKeysInClasses])
    ) as (keyof Elements)[];

    // Sort appearance keys by the number of `__` occurrences
    finalAppearanceKeys.sort((a, b) => {
      const countA = (a.match(/__/g) || []).length;
      const countB = (b.match(/__/g) || []).length;

      return countB - countA;
    });

    // Remove appearance keys from the className
    const finalClassName = classes
      .filter((className) => !(finalAppearanceKeys as string[]).includes(className))
      .join(' ');

    let appearanceClassnames: string[] = [];
    for (let i = 0; i < finalAppearanceKeys.reverse().length; i += 1) {
      if (typeof appearance.elements()?.[finalAppearanceKeys[i]] === 'string') {
        appearanceClassnames.push(appearance.elements()?.[finalAppearanceKeys[i]] as string);
      }
    }

    /*
     ** Attempt to fix any classname clashes here when a specific appearance key is changing the same
     ** css property.
     **
     ** For example:
     ** back__button: 'bg-blue-500',
     ** button: 'bg-red-500',
     **
     ** The above will clash, so we need to merge them together.
     **
     ** We do this by reversing the appearance keys (to have the more specific ones last) and merging them together.
     ** Currently only using twMerge so it won't work for other css frameworks but we can allow
     ** passing a custom merge function in the future, or just wrap with more logic to support more frameworks.
     */
    appearanceClassnames = [publicFacingTwMerge(appearanceClassnames)];

    const cssInJsClasses =
      !!finalAppearanceKeys.length && !isServer()
        ? finalAppearanceKeys.map((appKey) => appearance.appearanceKeyToCssInJsClass[appKey])
        : [];

    return cn(
      ...finalAppearanceKeys.map((key) => `nv-${key}`),
      '🔔',
      finalClassName, // default styles
      appearanceClassnames, // overrides via appearance prop classes
      ...cssInJsClasses
    );
  });

  return styleFuncMemo();
};
