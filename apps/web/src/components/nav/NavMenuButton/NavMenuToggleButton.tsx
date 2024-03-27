import { IconArrowDropUp, IconArrowDropDown } from '@novu/design-system';
import { FC, PropsWithChildren, useState } from 'react';
import { css } from '../../../styled-system/css';
import { Flex, HStack } from '../../../styled-system/jsx';
import { INavMenuButtonProps, rawButtonBaseStyles, ButtonLabel } from './NavMenuButton.shared';

type INavMenuToggleButtonProps = Omit<INavMenuButtonProps, 'rightSide'>;

export const NavMenuToggleButton: FC<PropsWithChildren<INavMenuToggleButtonProps>> = ({
  testId,
  icon,
  label,
  children,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleClick = () => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  };

  return (
    <>
      <button className={css(rawButtonBaseStyles)} data-test-id={testId} onClick={handleClick}>
        <HStack justifyContent={'space-between'} w="inherit">
          <HStack gap="75">
            {icon}
            <ButtonLabel variant={'strong'} color="typography.text.secondary">
              {label}
            </ButtonLabel>
          </HStack>
          {isOpen ? <IconArrowDropUp /> : <IconArrowDropDown />}
        </HStack>
      </button>
      <Flex direction={'column'} pl="150">
        {!isOpen ? null : children}
      </Flex>
    </>
  );
};
