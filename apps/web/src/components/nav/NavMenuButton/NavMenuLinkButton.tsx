import { FC, PropsWithChildren, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { css } from '../../../styled-system/css';
import { HStack } from '../../../styled-system/jsx';
import { INavMenuButtonProps, rawButtonBaseStyles, ButtonLabel } from './NavMenuButton.shared';
import { NavMenuRightSide } from './NavMenuButtonRightSide';

const rawLinkButtonStyles = css.raw({
  '& _active, &.active': {
    _before: {
      content: '""',
      position: 'absolute',
      width: '50',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      borderTopLeftRadius: '8px',
      borderBottomLeftRadius: '8px',
      bgGradient: 'vertical',
    },
  },
});

interface INavMenuLinkButtonProps extends INavMenuButtonProps {
  link: string;
}

export const NavMenuLinkButton: FC<PropsWithChildren<INavMenuLinkButtonProps>> = ({
  rightSide,
  testId,
  icon,
  link,
  label,
  isVisible = true,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const shouldShowRightSide = Boolean(
    rightSide && (!rightSide.triggerOn || (rightSide.triggerOn === 'hover' && isHovered))
  );

  return isVisible ? (
    <NavLink
      className={css(rawButtonBaseStyles, rawLinkButtonStyles)}
      to={link}
      data-test-id={testId}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <HStack gap="75">
        {icon}
        <ButtonLabel variant={'strong'} color="typography.text.secondary">
          {label}
        </ButtonLabel>
      </HStack>
      <NavMenuRightSide tooltip={rightSide?.tooltip} isMounted={shouldShowRightSide}>
        {rightSide?.node}
      </NavMenuRightSide>
    </NavLink>
  ) : null;
};
