import type { IResponseError } from '@novu/shared';

export function parseServerErrorMessage(error: IResponseError | null): string {
  if (!error) {
    return '';
  }

  return Array.isArray(error?.message) ? error?.message[0] : error?.message;
}
