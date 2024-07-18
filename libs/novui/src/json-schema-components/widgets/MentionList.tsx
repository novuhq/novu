import { Menu } from '@mantine/core';
import { type SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { css } from '../../../styled-system/css';

import React, { forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { useDisclosure } from '@mantine/hooks';

type VariableItem = {
  id: string;
  label: string;
};
export type MentionRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

type MentionListProps = SuggestionProps<VariableItem>;

export const MentionList = forwardRef<MentionRef, MentionListProps>(({ clientRect, command, query, items }, ref) => {
  const [opened, handlers] = useDisclosure(true);

  const enterHandler = () => {
    handlers.close();
  };
  useImperativeHandle(ref, () => ({
    onBlur: () => {
      console.log('nknk');
    },
    onKeyDown: ({ event }) => {
      console.log(event);
      if (event.key === 'Escape') {
        enterHandler();

        return true;
      }

      return false;
    },
  }));

  const handleCommand = (id: string) => {
    const item = items.find((item) => item.id === id);
    if (!item) return;
    command(item);
  };

  return createPortal(
    <Menu
      opened={opened}
      closeOnClickOutside
      closeOnEscape
      clickOutsideEvents={['click', 'mousedown', 'touchstart']}
      classNames={stylesTry}
      position="bottom-start"
      width={200}
    >
      <Menu.Target>
        <div
          style={{
            position: 'absolute',
            top: clientRect?.()?.bottom,
            left: clientRect?.()?.left,
          }}
        />
      </Menu.Target>

      <Menu.Dropdown>
        {items.map((item) => {
          return (
            <Menu.Item key={item.id} onClick={() => handleCommand(item.id)}>
              {item.label}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>,
    document.body
  );
});

const stylesTry = {
  root: css({
    background: 'input.surface !important',
    borderColor: 'input.border !important',
  }),
  item: css({
    padding: '50 !important',
    marginY: '25',
    borderRadius: '50 !important',

    overflow: 'none !important',
    textOverflow: 'ellipsis',
    color: 'typography.text.main !important',
    _hover: {
      bg: 'select.option.surface.hover !important',
    },
    _selected: {
      fontWeight: 'strong',
      bg: 'select.option.surface.selected !important',
    },
  }),
  dropdown: css({
    bg: 'surface.popover !important',
    borderRadius: 'input !important',
    padding: '25',
    marginY: '25',
    border: 'none !important',
    boxShadow: 'medium !important',
    color: 'typography.text.main',
    maxHeight: '[200px]',
    overflow: 'none !important',
    overflowY: 'auto',
    textOverflow: 'ellipsis',
  }),
};
