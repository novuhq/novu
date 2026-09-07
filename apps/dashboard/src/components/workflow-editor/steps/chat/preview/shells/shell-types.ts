import type { CardElement } from '@novu/shared';
import type { ReactNode } from 'react';

export type ChatShellVariant = 'default' | 'mini';

export type ChatShellProps = {
  card?: CardElement;
  /** Loading / placeholder content rendered inside the shell when `card` is absent. */
  children?: ReactNode;
  variant?: ChatShellVariant;
};
