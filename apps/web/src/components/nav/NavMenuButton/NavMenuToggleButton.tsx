import { css, cx } from '@novu/novui/css';
import { IconKeyboardArrowDown, IconKeyboardArrowUp } from '@novu/novui/icons';
import { HStack, Stack } from '@novu/novui/jsx';
import { FC, PropsWithChildren, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useHover } from '../../../hooks/useHover';
import { truncatedFlexTextCss } from '../../../studio/utils/shared.styles';
import { INavMenuButtonProps, NavMenuButtonInner, rawButtonBaseStyles } from './NavMenuButton.shared';

type INavMenuToggleButtonProps = { link: string } & Omit<INavMenuButtonProps, 'rightSide'>;

export const NavMenuToggleButton: FC<PropsWithChildren<INavMenuToggleButtonProps>> = ({
  testId,
  icon,
  label,
  children,
  className,
  link,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { isHovered, ...hoverProps } = useHover();

  const handleClick = () => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  };

  return (
    <>
      <NavLink
        data-test-id={testId}
        onClick={handleClick}
        to={link}
        className={cx(
          css(rawButtonBaseStyles),
          css({
            lineHeight: '125',
            '& _active, &.active': { background: 'transparent !important', boxShadow: 'none' },
          }),
          className
        )}
        {...hoverProps}
      >
        {({ isActive }) => {
          setIsOpen(isActive);

          return (
            <HStack justifyContent={'space-between'} w="inherit" className={css(truncatedFlexTextCss)}>
              <NavMenuButtonInner icon={icon}>{label}</NavMenuButtonInner>
              {isOpen ? <IconKeyboardArrowUp /> : isHovered ? <IconKeyboardArrowDown /> : null}
            </HStack>
          );
        }}
      </NavLink>
      <Stack pl="100" gap="25">
        {!isOpen ? null : children}
      </Stack>
    </>
  );
};
