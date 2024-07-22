import React, { forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside, useDisclosure } from '@mantine/hooks';
import { Menu } from '@mantine/core';
import { type SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { css } from '../../../styled-system/css';

export type VariableItem = {
  id: string;
  label: string;
};

export type SuggestionListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
  focus: () => void;
};

type SuggestionListProps = SuggestionProps<VariableItem>;

export const VariableSuggestionList = forwardRef<SuggestionListRef, SuggestionListProps>(
  ({ clientRect, command, query, items }, ref) => {
    const [opened, { close: closeSuggestionList, open: openSuggestionList }] = useDisclosure(true);

    // ref for closing the menu any time there's a click elsewhere.
    const clickOutRef = useClickOutside(() => {
      closeSuggestionList();
    });

    useImperativeHandle(ref, () => ({
      close: () => {
        closeSuggestionList();
      },
      focus: () => {
        openSuggestionList();
      },
      onKeyDown: ({ event }) => {
        if (event.key === 'Escape') {
          closeSuggestionList();

          return true;
        }

        return false;
      },
    }));

    const handleCommand = (id: string) => {
      const item = items.find((item) => item.id === id);
      if (!item) {
        return;
      }
      command(item);
    };

    return createPortal(
      <Menu
        opened={opened}
        closeOnEscape
        classNames={stylesTry}
        position="bottom-start"
        width={200}
        // for some reason these don't seem to work, so we use clickOutRef on the dropdown
        closeOnClickOutside
        clickOutsideEvents={['click', 'mousedown', 'touchstart']}
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

        <Menu.Dropdown ref={clickOutRef}>
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
  }
);

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
