import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CSSProperties, Elements, Variables } from '../context';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result.toLowerCase();
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
export function generatesShadesFromColor(color: string, key: string) {
  const rules = [];
  //alpha shades
  for (let i = 0; i < shades.length; i++) {
    const shade = shades[i];
    const cssVariableAlphaRule = `:root { --novu-colors-${key}-alpha-${shade}: oklch(from ${color} l c h / ${
      shade / 1000
    }); }`;
    rules.push(cssVariableAlphaRule);
  }
  //solid shades
  for (let i = 0; i < shades.length; i++) {
    const shade = shades[i];
    const cssVariableSolidRule = `:root { --novu-colors-${key}-${shade}: oklch(from ${color} calc(l - ${
      (shade - 500) / 1000
    }) c h); }`;
    rules.push(cssVariableSolidRule);
  }

  return rules;
}

export const parseVariables = (variables: Variables) => {
  //handle color variables
  const variableRules = [];
  for (const key in variables?.colors) {
    const colors = variables?.colors;

    if (colors && colors.hasOwnProperty(key)) {
      const value = colors[key as keyof Variables['colors']];
      variableRules.push(...generatesShadesFromColor(value, key));
    }
  }

  return variableRules;
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
