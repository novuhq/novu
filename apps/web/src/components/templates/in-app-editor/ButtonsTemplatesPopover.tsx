import { Popover, createStyles } from '@mantine/core';
import { IMessageAction, IMessageButton, MessageActionStatusEnum } from '@novu/shared';

import { colors } from '../../../design-system';
import { ButtonsTemplates } from './ButtonsTemplates';

const usePopoverStyles = createStyles(({ colorScheme }) => ({
  dropdown: {
    margin: 0,
    padding: 0,
    backgroundColor: colorScheme === 'dark' ? colors.B20 : colors.white,
    color: colorScheme === 'dark' ? colors.white : colors.B40,
    border: 'none',
    marginTop: '1px',
    width: '100%',
  },
  arrow: {
    backgroundColor: colorScheme === 'dark' ? colors.B20 : colors.white,
    height: '-22px',
    border: 'none',
    margin: '0px',
  },
}));

interface IButtonsTemplatesPopoverProps {
  isVisible: boolean;
  setIsPopoverVisible: (boolean) => void;
  setTemplateSelected: (boolean) => void;
  children: JSX.Element;
  onChange: (data: any) => void;
  value: IMessageAction;
}

export function ButtonsTemplatesPopover({
  children,
  isVisible,
  setIsPopoverVisible,
  setTemplateSelected,
  onChange,
}: IButtonsTemplatesPopoverProps) {
  const { classes } = usePopoverStyles();

  function handleOnButtonChange(buttons: IMessageButton[]) {
    if (buttons) {
      const newAction = { buttons: buttons, status: MessageActionStatusEnum.PENDING };
      onChange(newAction);
    }
  }

  return (
    <Popover
      opened={isVisible}
      onClose={() => setIsPopoverVisible(false)}
      position={'bottom'}
      withArrow
      classNames={classes}
    >
      <Popover.Target>{children}</Popover.Target>
      <Popover.Dropdown>
        <ButtonsTemplates
          setTemplateSelected={setTemplateSelected}
          setIsPopoverVisible={setIsPopoverVisible}
          setSelectedTemplate={handleOnButtonChange}
        />
      </Popover.Dropdown>
    </Popover>
  );
}
