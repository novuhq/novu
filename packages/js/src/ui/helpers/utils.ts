import clsx, { ClassValue } from 'clsx';
import { CSSProperties, Elements, Variables } from '../context';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
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
  //add to set to avoid generating the same class again
  classNameSet.add(className);

  return { className, rule };
}

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
export function generateDefaultColor(color: string, key: string) {
  const cssVariableDefaultRule = `:root { --nv-${key}: oklch(from ${color} l c h); }`;

  return cssVariableDefaultRule;
}

export function generatesSolidShadesFromColor(color: string, key: string) {
  const rules = [];
  for (let i = 0; i < shades.length; i++) {
    const shade = shades[i];
    const cssVariableSolidRule = `:root { --nv-${key}-${shade}: oklch(from ${color} calc(l - ${
      (shade - 500) / 1000
    }) c h); }`;
    rules.push(cssVariableSolidRule);
  }

  return rules;
}

export function generatesAlphaShadesFromColor(color: string, key: string) {
  const rules = [];
  for (let i = 0; i < shades.length; i++) {
    const shade = shades[i];
    const cssVariableAlphaRule = `:root { --nv-${key}-${shade}: oklch(from ${color} l c h / ${shade / 1000}); }`;
    rules.push(cssVariableAlphaRule);
  }

  return rules;
}

export const parseVariables = (variables: Required<Variables>) => {
  return [
    generateDefaultColor(variables.colorBackground, 'color-background'),
    generateDefaultColor(variables.colorForeground, 'color-foreground'),
    generateDefaultColor(variables.colorPrimary, 'color-primary'),
    generateDefaultColor(variables.colorPrimaryForeground, 'color-primary-foreground'),
    generateDefaultColor(variables.colorSecondary, 'color-secondary'),
    generateDefaultColor(variables.colorSecondaryForeground, 'color-secondary-foreground'),
    ...generatesAlphaShadesFromColor(variables.colorBackground, 'color-background-alpha'),
    ...generatesAlphaShadesFromColor(variables.colorForeground, 'color-foreground-alpha'),
    ...generatesSolidShadesFromColor(variables.colorPrimary, 'color-primary'),
    ...generatesAlphaShadesFromColor(variables.colorPrimary, 'color-primary-alpha'),
    ...generatesAlphaShadesFromColor(variables.colorPrimaryForeground, 'color-primary-foreground-alpha'),
    ...generatesSolidShadesFromColor(variables.colorSecondary, 'color-secondary'),
    ...generatesAlphaShadesFromColor(variables.colorSecondary, 'color-secondary-alpha'),
    ...generatesAlphaShadesFromColor(variables.colorSecondaryForeground, 'color-secondary-foreground-alpha'),
    ...generatesAlphaShadesFromColor(variables.colorNeutral, 'color-neutral-alpha'),
  ];
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

  return elementsStyleData;
};
