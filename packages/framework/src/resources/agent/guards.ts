import type { CardElement } from 'chat';

export function isCardElement(value: object): value is CardElement {
  return 'type' in value && (value as { type: string }).type === 'card';
}
