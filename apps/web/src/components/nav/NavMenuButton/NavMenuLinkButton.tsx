import { FC, PropsWithChildren, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { css } from '../../../styled-system/css';
import { HStack } from '../../../styled-system/jsx';
import { INavMenuButtonProps, rawButtonBaseStyles, ButtonLabel } from './NavMenuButton.shared';

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
      borderRadius: '7px 0px 0px 7px',
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
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

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
      {rightSide ? rightSide : null}
    </NavLink>
  ) : null;
};
