import { FC, PropsWithChildren, useState } from 'react';
import { Text } from '@novu/novui';
import { css, cx } from '@novu/novui/css';
import { Flex, HStack } from '@novu/novui/jsx';
import { INavMenuButtonProps, rawButtonBaseStyles } from './NavMenuButton.shared';
import { IconKeyboardArrowDown, IconKeyboardArrowUp } from '@novu/novui/icons';

type INavMenuToggleButtonProps = Omit<INavMenuButtonProps, 'rightSide'>;

export const NavMenuToggleButton: FC<PropsWithChildren<INavMenuToggleButtonProps>> = ({
  testId,
  icon,
  label,
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleClick = () => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  };

  return (
    <>
      <button data-test-id={testId} onClick={handleClick}>
        <HStack justifyContent={'space-between'} className={cx(css(rawButtonBaseStyles), className)}>
          <HStack gap="75">
            {icon}
            <span>{label}</span>
          </HStack>
          {isOpen ? <IconKeyboardArrowUp /> : <IconKeyboardArrowDown />}
        </HStack>
      </button>
      <Flex direction={'column'} pl="150">
        {!isOpen ? null : children}
      </Flex>
    </>
  );
};
