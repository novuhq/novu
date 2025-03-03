import clsx, { ClassValue } from 'clsx';
import { extendTailwindMerge, type ClassNameValue } from 'tailwind-merge';
import type { CSSProperties, Elements, Tab, Variables } from '../types';

const twMerge = extendTailwindMerge({
  prefix: 'nt-',
});

export const publicFacingTwMerge = extendTailwindMerge({});

export type ClassName = ClassNameValue;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

function generateUniqueRandomString(set: Set<string>, length: number): string {
  let randomString: string;
  do {
    randomString = generateRandomString(length);
  } while (set.has(randomString));

  return randomString;
}

export function cssObjectToString(styles: CSSProperties): string {
  return Object.entries(styles)
    .map(([key, value]) => {
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();

      return `${kebabKey}: ${value};`;
    })
    .join(' ');
}

export function createClassAndRuleFromCssString(classNameSet: Set<string>, styles: string) {
  const className = `novu-css-${generateUniqueRandomString(classNameSet, 8)}`;
  const rule = `.${className} { ${styles} }`;
  classNameSet.add(className);

  return { className, rule };
}

const shades = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

export function generateDefaultColor(props: { color: string; key: string; id: string }) {
  const cssVariableDefaultRule = `.${props.id} { --nv-${props.key}: oklch(from ${props.color} l c h); }`;

  return cssVariableDefaultRule;
}

export function generateSolidShadeRulesFromColor({ color, key, id }: { color: string; key: string; id: string }) {
  const rules: string[] = [];

  const adjustLightness = (factor: number) => {
    if (factor >= 0) {
      return `min(1, calc(l + ${factor} * (1 - l)))`;
    } else {
      return `max(0, calc(l * (1 + ${factor})))`;
    }
  };

  const lightnessOffsets: Record<number, string> = {
    25: adjustLightness(0.475),
    50: adjustLightness(0.45),
    100: adjustLightness(0.4),
    200: adjustLightness(0.3),
    300: adjustLightness(0.2),
    400: adjustLightness(0.1),
    500: 'l',
    600: adjustLightness(-0.1),
    700: adjustLightness(-0.2),
    800: adjustLightness(-0.3),
    900: adjustLightness(-0.4),
  };

  shades.forEach((shade) => {
    const newLightness = lightnessOffsets[shade];
    const cssVariableRule = `.${id} { --nv-${key}-${shade}: oklch(from ${color} ${newLightness} c h); }`;
    rules.push(cssVariableRule);
  });

  return rules;
}

export function generateAlphaShadeRulesFromColor({ color, key, id }: { color: string; key: string; id: string }) {
  const rules: string[] = [];
  const alphaMap = {
    25: 0.025,
    50: 0.05,
    100: 0.1,
    200: 0.2,
    300: 0.3,
    400: 0.4,
    500: 0.5,
    600: 0.6,
    700: 0.7,
    800: 0.8,
    900: 0.9,
  };

  Object.entries(alphaMap).forEach(([shade, alpha]) => {
    const cssVariableAlphaRule = `.${id} { --nv-${key}-${shade}: oklch(from ${color} l c h / ${alpha}); }`;
    rules.push(cssVariableAlphaRule);
  });

  return rules;
}

export function generateFontSizeRules(props: { id: string; baseFontSize: string }) {
  const { id, baseFontSize } = props;

  const sizeRatios = {
    xs: 0.65625,
    sm: 0.765625,
    base: 0.875,
    lg: 0.984375,
    xl: 1.09375,
    '2xl': 1.3125,
    '3xl': 1.640625,
    '4xl': 1.96875,
  };

  const rules: string[] = [];

  Object.entries(sizeRatios).forEach(([key, ratio]) => {
    const size = `calc(${baseFontSize} * ${ratio})`;

    const cssVariableRule = `.${id} { --nv-font-size-${key}: ${size}; }`;
    rules.push(cssVariableRule);
  });

  return rules;
}

export function generateBorderRadiusRules(props: { id: string; baseRadius: string }) {
  const { id, baseRadius } = props;

  const radiusRatios = {
    none: 0,
    xs: 0.333,
    sm: 0.667,
    md: 1,
    lg: 1.333,
    xl: 2,
    '2xl': 2.667,
    '3xl': 4,
    full: 9999,
  };

  const rules: string[] = [];

  Object.entries(radiusRatios).forEach(([key, ratio]) => {
    // eslint-disable-next-line no-nested-ternary
    const value = key === 'none' ? '0px' : key === 'full' ? '9999px' : `calc(${baseRadius} * ${ratio})`;

    const cssVariableRule = `.${id} { --nv-radius-${key}: ${value}; }`;
    rules.push(cssVariableRule);
  });

  return rules;
}

export const parseVariables = (variables: Required<Variables>, id: string) => {
  const rules = [
    generateDefaultColor({ color: variables.colorBackground, key: 'color-background', id }),
    generateDefaultColor({ color: variables.colorForeground, key: 'color-foreground', id }),
    generateDefaultColor({ color: variables.colorPrimary, key: 'color-primary', id }),
    generateDefaultColor({ color: variables.colorPrimaryForeground, key: 'color-primary-foreground', id }),
    generateDefaultColor({ color: variables.colorSecondary, key: 'color-secondary', id }),
    generateDefaultColor({ color: variables.colorSecondaryForeground, key: 'color-secondary-foreground', id }),
    generateDefaultColor({ color: variables.colorCounter, key: 'color-counter', id }),
    generateDefaultColor({ color: variables.colorCounterForeground, key: 'color-counter-foreground', id }),
    generateDefaultColor({ color: variables.colorShadow, key: 'color-shadow', id }),
    generateDefaultColor({ color: variables.colorRing, key: 'color-ring', id }),
    ...generateAlphaShadeRulesFromColor({ color: variables.colorBackground, key: 'color-background-alpha', id }),
    ...generateAlphaShadeRulesFromColor({ color: variables.colorForeground, key: 'color-foreground-alpha', id }),
    ...generateSolidShadeRulesFromColor({ color: variables.colorPrimary, key: 'color-primary', id }),
    ...generateAlphaShadeRulesFromColor({ color: variables.colorPrimary, key: 'color-primary-alpha', id }),
    ...generateAlphaShadeRulesFromColor({
      color: variables.colorPrimaryForeground,
      key: 'color-primary-foreground-alpha',
      id,
    }),
    ...generateSolidShadeRulesFromColor({ color: variables.colorSecondary, key: 'color-secondary', id }),
    ...generateAlphaShadeRulesFromColor({ color: variables.colorSecondary, key: 'color-secondary-alpha', id }),
    ...generateAlphaShadeRulesFromColor({
      color: variables.colorSecondaryForeground,
      key: 'color-secondary-foreground-alpha',
      id,
    }),
    ...generateAlphaShadeRulesFromColor({ color: variables.colorNeutral, key: 'color-neutral-alpha', id }),
    ...generateFontSizeRules({ id, baseFontSize: variables.fontSize }),
    ...generateBorderRadiusRules({ id, baseRadius: variables.borderRadius }),
  ];

  return rules;
};

export const parseElements = (elements: Elements) => {
  const elementsStyleData: { key: string; rule: string; className: string }[] = [];
  const generatedClassNames = new Set<string>();
  for (const key in elements) {
    if (elements.hasOwnProperty(key)) {
      const value = elements[key as keyof Elements];
      if (typeof value === 'object') {
        // means it is css in js object
        const cssString = cssObjectToString(value);
        const { className, rule } = createClassAndRuleFromCssString(generatedClassNames, cssString);
        elementsStyleData.push({ key, rule, className });
      }
    }
  }

  /*
   ** Sort the elements by the number of __ in the className
   ** This is to ensure that the most specific elements are applied last
   ** i.e. dropdownItem__icon should be applied last so that it can override the icon class from dropdownItem
   */
  const sortedElementsStyleData = elementsStyleData.sort((a, b) => {
    const countA = (a.key.match(/__/g) || []).length;
    const countB = (b.key.match(/__/g) || []).length;

    return countA - countB;
  });

  return sortedElementsStyleData;
};

/**
 * In the next minor release we can remove the deprecated `value` field from the Tab type.
 * This function can be removed after that and the code should be updated to use the `filter` field.
 * @returns tags from the tab object
 */
export const getTagsFromTab = (tab?: Tab) => {
  return tab?.filter?.tags || tab?.value || [];
};
