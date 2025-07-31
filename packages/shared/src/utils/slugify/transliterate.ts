import { builtinReplacements } from './builtinReplacements';

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
function escapeStringRegexp(str: string) {
  if (typeof str !== 'string') {
    throw new TypeError('Expected a string');
  }

  return str.replace(matchOperatorsRe, '\\$&');
}

const doCustomReplacements = (string: string, replacements: Map<string, string>) => {
  for (const [key, value] of replacements) {
    // TODO: Use `String#replaceAll()` when targeting Node.js 16.
    string = string.replace(new RegExp(escapeStringRegexp(key), 'g'), value);
  }

  return string;
};

type TransliterateOptions = {
  customReplacements: [string, string][];
};

export const transliterate = (string: string, options: TransliterateOptions) => {
  if (typeof string !== 'string') {
    throw new TypeError(`Expected a string, got \`${typeof string}\``);
  }

  options = {
    ...options,
    customReplacements: options.customReplacements || [],
  };

  const customReplacements = new Map<string, string>([
    ...(builtinReplacements as [string, string][]),
    ...(options.customReplacements as [string, string][]),
  ]);

  string = string.normalize();
  string = doCustomReplacements(string, customReplacements);
  string = string
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .normalize();

  return string;
};
