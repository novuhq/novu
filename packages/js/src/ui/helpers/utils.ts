import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CSSProperties } from '../context';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cssObjectToString(styles: CSSProperties): string {
  return Object.entries(styles)
    .map(([key, value]) => {
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();

      return `${kebabKey}: ${value};`;
    })
    .join(' ');
}

export function createClassFromCssString(styleElement: HTMLStyleElement, styles: string) {
  const index = styleElement.sheet?.cssRules.length ?? 0;
  const className = `nv-css-${index}`;
  const rule = `.${className} { ${styles} }`;
  styleElement.sheet?.insertRule(rule, index);

  return className;
}
