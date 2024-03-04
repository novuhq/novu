import { useMemo } from 'react';
import { styled, type HTMLStyledProps, type StyledComponent } from '../../../styled-system/jsx';
import { text, type TextVariantProps, TextVariant } from '../../../styled-system/recipes';

export type TitleAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type TextAs = 'p' | 'span' | 'div' | 'label';

type As = TextAs | TitleAs;

const VARIANT_ROLE_LOOKUP: Record<TextVariant['variant'], As> = {
  'text.main': 'p',
  'text.secondary': 'p',
  'text.mono': 'p',
  'text.strong': 'p',
  'title.page': 'h1',
  'title.section': 'h2',
  'title.subsection': 'h3',
};

export type TextProps = {
  as?: As;
} & TextVariantProps &
  HTMLStyledProps<As>;

/**
 * Component for showing Text or Titles. All flavors of text should be done through this component.
 *
 * @default text.main
 */
export const Text: React.FC<TextProps> = (props) => {
  const { variant = 'text.main', ...localProps } = props;
  const as = localProps.as ?? VARIANT_ROLE_LOOKUP[variant as TextVariant['variant']];

  const Dynamic = useMemo(() => styled(as, text) as StyledComponent<As>, [as]);

  return <Dynamic {...localProps} textStyle={variant} />;
};

Text.displayName = 'Text';
