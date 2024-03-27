import { IconArrowBack } from '@novu/design-system';
import { LocalizedMessage } from '@novu/shared-web';
import { FC, MouseEventHandler } from 'react';
import { css, cx } from '../../styled-system/css';
import { Flex, styled, VStack } from '../../styled-system/jsx';
import { title as titleRecipe } from '../../styled-system/recipes';

const iconButtonStyles = css({
  display: 'inline-flex',
  alignItems: 'center',
  padding: 0,
  backgroundImage: 'none',
  background: 'transparent',
  height: 'inherit',
  border: 'none',
  cursor: 'pointer',
  outline: 'inherit',
  paddingInline: 0,
  paddingBlock: 0,
  '& span': {
    backgroundImage: 'none',
  },
  '& svg': {
    fill: 'typography.text.secondary',
  },
  '&:disabled svg': {
    opacity: '40%',
  },
});

const navStyles = css({
  h: '100%',
  display: 'flex',
  flexDirection: 'column',
});

const Title = styled('h2', titleRecipe);

/**
 * designate whether a menu is a root / top-level menu
 * or if it is a nested view
 */
type NavMenuVariant = 'root' | 'nested';

interface INavMenuProps {
  variant: NavMenuVariant;
  title?: LocalizedMessage;
  onBackButtonClick?: MouseEventHandler;
  className?: string;
}

export const NavMenu: FC<React.PropsWithChildren<INavMenuProps>> = ({
  variant,
  title,
  onBackButtonClick,
  children,
  className,
}) => {
  const handleBackButtonClick: MouseEventHandler = (event) => {
    onBackButtonClick?.(event);
  };

  return (
    <nav className={cx(navStyles, className)}>
      <Flex flexDirection={'column'} h="100%">
        {(title || variant === 'nested') && (
          <Flex gap={'100'} h={'200'} w="100%" my={'75'} alignItems={'center'}>
            {variant === 'nested' && (
              // TODO: this should be a Design System component for IconButton
              <button className={iconButtonStyles}>
                <IconArrowBack size="24" onClick={handleBackButtonClick} />
              </button>
            )}
            {title && (
              <Title variant={'section'} color="typography.text.secondary">
                {title}
              </Title>
            )}
          </Flex>
        )}
        {children}
      </Flex>
    </nav>
  );
};
