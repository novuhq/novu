import { FC, MouseEventHandler, useState } from 'react';
import { token } from '../../styled-system/tokens';
import { hstack } from '../../styled-system/patterns';
import { Title } from '../components';
import { IconExpandLess, IconExpandMore } from '../icons';
import { CorePropsWithChildren } from '../types';
import { cva, cx } from '../../styled-system/css';

export const FormGroupTitle: FC<CorePropsWithChildren> = ({ children, ...titleProps }) => {
  return (
    <Title variant="subsection" color="typography.text.secondary" {...titleProps}>
      {children}
    </Title>
  );
};

export const useExpandToggle = (defaultValue: boolean = true) => {
  const [isExpanded, setExpanded] = useState<boolean>(defaultValue);

  return [isExpanded, () => setExpanded((prevExpanded) => !prevExpanded)] as const;
};

type SectionTitleToggleProps = CorePropsWithChildren &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
    onToggle: () => void;
    isExpanded: boolean;
  };

const toggleButtonRecipe = cva({
  base: {
    gap: 'margins.icons.Icon20-txt',
    cursor: 'pointer',
    _hover: { opacity: 'hover' },
  },
  variants: {
    isExpanded: {
      true: { marginBottom: '100' },
      false: {},
    },
  },
});

export const SectionTitleToggle: FC<SectionTitleToggleProps> = ({ children, onToggle, isExpanded, ...buttonProps }) => {
  const handleToggle: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    onToggle();
  };

  return (
    <button onClick={handleToggle} className={cx(hstack(), toggleButtonRecipe({ isExpanded }))} {...buttonProps}>
      {isExpanded ? (
        <IconExpandLess title="expand-less-section-icon" color={token('colors.typography.text.main')} />
      ) : (
        <IconExpandMore title="expand-more-section-icon" />
      )}
      {children}
    </button>
  );
};

export const JSON_SCHEMA_FORM_ID_DELIMITER = '~~~';

export function calculateSectionDepth({ sectionId }: { sectionId: string }): number {
  // FIXME: this is brittle
  return sectionId.split(JSON_SCHEMA_FORM_ID_DELIMITER).length - 1;
}

export function getVariantFromDepth(depth: number) {
  return depth % 2 === 0 ? 'even' : 'odd';
}
