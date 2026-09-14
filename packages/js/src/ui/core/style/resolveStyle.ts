import { appearanceKeys } from '../../config/appearanceKeys';
import type { AllAppearanceKey, AllElements, AllIconKey } from '../../types';
import { cn, publicFacingTwMerge } from './cn';

export type ResolveStyleArgs = {
  key: AllAppearanceKey;
  className?: string;
  iconKey?: AllIconKey;
  context?: any;
};

export type StyleSource = {
  elements: AllElements;
  appearanceKeyToCssInJsClass: Record<string, string>;
  /** css-in-js classes are only known on the client; keep them out of server output */
  isServer?: boolean;
};

/**
 * Resolves an appearance key (plus the base classes a renderer passes) into the final class attribute:
 * the `nv-*` marker classes for every matching key, the base classes, the host's class overrides merged with
 * tailwind-merge, and the generated css-in-js classes.
 *
 * Both the Solid engine and host-native blocks call this, so an item looks identical wherever it is rendered.
 */
export const resolveStyle = ({ key, className, iconKey, context }: ResolveStyleArgs, source: StyleSource): string => {
  if (!key) {
    return cn(className);
  }

  const appearanceKeyParts = key.split('__');
  let finalAppearanceKeys: (keyof AllElements)[] = [];
  for (let i = 0; i < appearanceKeyParts.length; i += 1) {
    const accumulated = appearanceKeyParts.slice(i).join('__');
    if (appearanceKeys.includes(accumulated as keyof AllElements)) {
      finalAppearanceKeys.push(accumulated as keyof AllElements);
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
  ) as (keyof AllElements)[];

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
  const reversedFinalAppearanceKeys = finalAppearanceKeys.reverse();
  for (let i = 0; i < reversedFinalAppearanceKeys.length; i += 1) {
    const elementStyles = source.elements[reversedFinalAppearanceKeys[i]];
    if (typeof elementStyles === 'string') {
      appearanceClassnames.push(elementStyles);
    } else if (typeof elementStyles === 'function') {
      appearanceClassnames.push(elementStyles(context));
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
    !!finalAppearanceKeys.length && !source.isServer
      ? finalAppearanceKeys.map((appKey) => source.appearanceKeyToCssInJsClass[appKey])
      : [];

  return cn(
    ...finalAppearanceKeys.map((key) => `nv-${key}`),
    '🔔',
    iconKey ? `nv-${iconKey} 🖼️` : '',

    finalClassName, // default styles
    appearanceClassnames, // overrides via appearance prop classes
    ...cssInJsClasses
  );
};
