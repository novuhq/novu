import React, { forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside, useDisclosure } from '@mantine/hooks';
import { Menu } from '@mantine/core';
import { type SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { variableSuggestionList } from '../../../styled-system/recipes';

export type VariableItem = {
  id: string;
  label: string;
};

export type SuggestionListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
  focus: () => void;
  close: () => void;
};

type SuggestionListProps = SuggestionProps<VariableItem>;

const suggestionListClassNames = variableSuggestionList();

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
        classNames={suggestionListClassNames}
        position="bottom-start"
        // for some reason these don't seem to work, so we use clickOutRef on the dropdown
        closeOnClickOutside
        clickOutsideEvents={['click', 'mousedown', 'touchstart']}
      >
        <Menu.Target>
          <div
            style={{
              position: 'absolute',
              // inline styles must be used here (instead of Panda) for dynamic / conditional behavior
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
