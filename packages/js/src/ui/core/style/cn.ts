import clsx, { ClassValue } from 'clsx';
import { type ClassNameValue, extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  prefix: 'nt-',
  extend: {
    // The motion tokens from `tailwind.config.js`, so `nt-duration-fast` and `nt-duration-200` override each other.
    classGroups: {
      duration: [{ duration: ['fast', 'base', 'slow'] }],
      ease: [{ ease: ['standard', 'enter', 'exit'] }],
    },
  },
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

export function generateUniqueRandomString(set: Set<string>, length: number): string {
  let randomString: string;
  do {
    randomString = generateRandomString(length);
  } while (set.has(randomString));

  return randomString;
}
