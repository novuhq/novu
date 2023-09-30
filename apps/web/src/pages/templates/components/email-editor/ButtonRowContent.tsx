import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { showNotification } from '@mantine/notifications';
import { TextInput as MantineInput, Popover, Button as MantineButton, createStyles } from '@mantine/core';
import { TextAlignEnum } from '@novu/shared';

import { colors, shadows } from '../../../../design-system';
import { TextAlignment, Wifi } from '../../../../design-system/icons';
import { useEnvController } from '../../../../hooks';
import type { IForm } from '../formTypes';

const usePopoverStyles = createStyles((theme) => ({
  dropdown: {
    padding: '5px',
    minWidth: 220,
    backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.white,
    color: theme.colorScheme === 'dark' ? theme.white : colors.B40,
    border: 'none',
    boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.medium,
  },
  arrow: {
    width: '7px',
    height: '7px',
    backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.white,
    border: 'none',
  },
}));

export function ButtonRowContent({
  stepIndex,
  blockIndex,
  brandingColor,
}: {
  stepIndex: number;
  blockIndex: number;
  brandingColor: string | undefined;
}) {
  const methods = useFormContext<IForm>();
  const content = methods.watch(`steps.${stepIndex}.template.content.${blockIndex}.content`);
  const textAlign = methods.watch(`steps.${stepIndex}.template.content.${blockIndex}.styles.textAlign`);
  const { readonly } = useEnvController();
  const [dropDownVisible, setDropDownVisible] = useState<boolean>(false);
  const { classes } = usePopoverStyles();

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      setDropDownVisible(false);
      showSaveSuccess();
    }
  }

  function showSaveSuccess() {
    showNotification({
      message: 'Button saved',
      color: 'green',
    });
  }

  return (
    <div style={{ textAlign: textAlign || TextAlignEnum.LEFT }} data-test-id="button-block-wrapper">
      <Popover
        classNames={classes}
        opened={dropDownVisible && !readonly}
        withArrow
        onClose={() => {
          setDropDownVisible(false);
          showSaveSuccess();
        }}
      >
        <Popover.Target>
          <MantineButton
            sx={{
              backgroundColor: brandingColor || 'red',
              '&:hover': {
                backgroundColor: brandingColor || 'red',
              },
            }}
            color="red"
            onClick={() => setDropDownVisible((open) => !open)}
          >
            {content}
          </MantineButton>
        </Popover.Target>
        <Popover.Dropdown>
          <Controller
            name={`steps.${stepIndex}.template.content.${blockIndex}.content`}
            defaultValue=""
            control={methods.control}
            render={({ field }) => {
              return (
                <MantineInput
                  {...field}
                  data-test-id="button-text-input"
                  icon={<TextAlignment />}
                  variant="unstyled"
                  onKeyDown={handleKeyDown}
                  placeholder="Button Text"
                />
              );
            }}
          />
          <Controller
            name={`steps.${stepIndex}.template.content.${blockIndex}.url`}
            defaultValue=""
            control={methods.control}
            render={({ field }) => {
              return (
                <MantineInput
                  {...field}
                  icon={<Wifi width={20} height={20} />}
                  variant="unstyled"
                  onKeyDown={handleKeyDown}
                  placeholder="https://www.yoururl..."
                />
              );
            }}
          />
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
