import { FC, PropsWithChildren, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { css, cx } from '@novu/novui/css';
import { HStack } from '@novu/novui/jsx';
import { INavMenuButtonProps, NavMenuButtonInner, rawButtonBaseStyles } from './NavMenuButton.shared';
import { NavMenuRightSide } from './NavMenuButtonRightSide';

const rawLinkButtonStyles = css.raw({
  // default color palette
  colorPalette: 'mode.cloud',
  '& _active, &.active': {
    _before: {
      content: '""',
      position: 'absolute',
      width: '50',
      top: '0',
      right: '0',
      bottom: '0',
      left: '0',
      borderTopLeftRadius: '100',
      borderBottomLeftRadius: '100',
      bgGradient: `to-b`,
      gradientFrom: 'colorPalette.start',
      gradientTo: 'colorPalette.end',
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
  className,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const shouldShowRightSide = Boolean(
    rightSide && (!rightSide.triggerOn || (rightSide.triggerOn === 'hover' && isHovered))
  );

  return isVisible ? (
    <NavLink
      className={cx(css(rawButtonBaseStyles, rawLinkButtonStyles), className)}
      to={link}
      data-test-id={testId}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NavMenuButtonInner icon={icon}>{label}</NavMenuButtonInner>
      <NavMenuRightSide tooltip={rightSide?.tooltip} isMounted={shouldShowRightSide}>
        {rightSide?.node}
      </NavMenuRightSide>
    </NavLink>
  ) : null;
};
