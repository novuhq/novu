import { IEmailBlock } from '@novu/shared';
import { useEffect, useState } from 'react';
import { showNotification } from '@mantine/notifications';
import { TextInput as MantineInput, Popover, Button as MantineButton, createStyles } from '@mantine/core';

import { colors, shadows } from '../../../design-system';
import { TextAlignment, Wifi } from '../../../design-system/icons';
import { useEnvController } from '../../../store/use-env-controller';

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
  block,
  onTextChange,
  onUrlChange,
  brandingColor,
}: {
  block: IEmailBlock;
  onTextChange: (text: string) => void;
  onUrlChange: (url: string) => void;
  brandingColor: string | undefined;
}) {
  const { readonly } = useEnvController();
  const [url, setUrl] = useState<string>();
  const [text, setText] = useState<string>();
  const [dropDownVisible, setDropDownVisible] = useState<boolean>(false);
  const { classes } = usePopoverStyles();

  function handleTextChange(e) {
    setText(e.target.value);
    onTextChange(e.target.value);
  }

  function handleUrlChange(e) {
    setUrl(e.target.value);
    onUrlChange(e.target.value);
  }

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

  useEffect(() => {
    setText(block.content);
  }, [block.content]);

  useEffect(() => {
    setUrl(block.url);
  }, [block.url]);

  return (
    <div style={{ textAlign: block?.styles?.textAlign || 'left' }} data-test-id="button-block-wrapper">
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
            {block.content}
          </MantineButton>
        </Popover.Target>
        <Popover.Dropdown>
          <MantineInput
            data-test-id="button-text-input"
            icon={<TextAlignment />}
            variant="unstyled"
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            value={text}
            placeholder="Button Text"
          />
          <MantineInput
            icon={<Wifi width={20} height={20} />}
            variant="unstyled"
            onChange={handleUrlChange}
            onKeyDown={handleKeyDown}
            value={url || ''}
            placeholder="Button Link"
          />
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
