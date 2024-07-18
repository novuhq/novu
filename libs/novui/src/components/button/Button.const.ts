import { ButtonProps as ExternalButtonProps, ButtonVariant as ExternalButtonVariant } from '@mantine/core';
import { type ButtonVariant } from '../../../styled-system/recipes';
import { IconSize } from '../../icons';

export const BUTTON_SIZE_TO_ICON_SIZE: Record<ButtonVariant['size'], IconSize> = {
  xs: '16',
  sm: '20',
  md: '20',
  lg: '20',
};

// Note: for right now, these are equivalent, but we haven't agreed on our size tokens (caps, one letter, etc)
export const BUTTON_SIZE_TO_EXTERNAL_BUTTON_SIZE: Record<ButtonVariant['size'], ExternalButtonProps['size']> = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

// Note: for right now, these are identical, but we may adjust them later
export const BUTTON_VARIANT_TO_EXTERNAL_BUTTON_VARIANT: Record<ButtonVariant['variant'], ExternalButtonVariant> = {
  filled: 'filled',
  outline: 'outline',
  transparent: 'transparent',
};

export const DEFAULT_VARIANT: ButtonVariant['variant'] = 'filled';
export const DEFAULT_SIZE: ButtonVariant['size'] = 'md';
