import { FC, MouseEventHandler } from 'react';
import { token } from '../../styled-system/tokens';
import { hstack } from '../../styled-system/patterns';
import { Title } from '../components';
import { IconExpandLess, IconExpandMore } from '../icons';
import { CoreProps, CorePropsWithChildren } from '../types';
import { cva, cx } from '../../styled-system/css';

export const FormGroupTitle: FC<CorePropsWithChildren> = ({ children, ...titleProps }) => {
  return (
    <Title variant="subsection" color="typography.text.secondary" {...titleProps}>
      {children}
    </Title>
  );
};

type SectionTitleToggleProps = CoreProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children' | 'title'> & {
    onToggle: () => void;
    isExpanded: boolean;
    sectionDepth: number;
    sectionTitle?: React.ReactNode;
  };

const toggleButtonRecipe = cva({
  base: {
    gap: 'margins.icons.Icon20-txt',

    cursor: 'pointer',
    _disabled: {
      cursor: 'default',
    },
    '&:hover:not(:disabled)': {
      opacity: 'hover',
    },
  },
  variants: {
    isExpanded: {
      true: { marginBottom: '100' },
      false: {},
    },
  },
});

export const SectionTitleToggle: FC<SectionTitleToggleProps> = ({
  onToggle,
  isExpanded,
  sectionDepth,
  sectionTitle,
  ...buttonProps
}) => {
  const handleToggle: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    onToggle();
  };

  const shouldShowToggle = sectionDepth > 0;

  if (!sectionTitle && !shouldShowToggle) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      disabled={!shouldShowToggle}
      className={cx(hstack(), toggleButtonRecipe({ isExpanded: isExpanded || !shouldShowToggle }))}
      {...buttonProps}
    >
      {!shouldShowToggle ? (
        sectionTitle
      ) : (
        <>
          {isExpanded ? (
            <IconExpandLess title="expand-less-section-icon" color={token('colors.typography.text.main')} />
          ) : (
            <IconExpandMore title="expand-more-section-icon" />
          )}
          {sectionTitle}
        </>
      )}
    </button>
  );
};
