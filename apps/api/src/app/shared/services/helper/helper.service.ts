import { v1 as uuidv1 } from 'uuid';

export function createGuid(): string {
  return uuidv1();
}

export function capitalize(text: string) {
  if (typeof text !== 'string') return '';

  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getFileExtensionFromPath(filePath: string): string {
  const regexp = /\.([0-9a-z]+)(?:[?#]|$)/i;
  const extension = filePath.match(regexp);

  return extension && extension[1];
}
