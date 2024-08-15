import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { VisuallyHidden, Combobox, useCombobox } from '@mantine/core';
import { type SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { variableSuggestionList } from '../../../styled-system/recipes';
import { Text } from '../../components';

export type VariableItem = {
  id: string;
  label: string;
};

export type SuggestionListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
  focus: () => void;
  blur: () => void;
  close: () => void;
};

type SuggestionListProps = SuggestionProps<VariableItem>;

const suggestionListClassNames = variableSuggestionList();

export const VariableSuggestionList = forwardRef<SuggestionListRef, SuggestionListProps>(
  ({ clientRect, command, query, items }, ref) => {
    const combobox = useCombobox({
      defaultOpened: true,
      onDropdownOpen: () => combobox.selectFirstOption(),
    });

    useEffect(() => {
      combobox.selectFirstOption();
    }, [items]);

    const customVariableLabel = () => {
      const error = !query.endsWith('}}');
      if (error) {
        command({ label: `{{${query}`, id: '', error: 'true' });
      } else {
        command({ label: query.slice(0, -2), id: '', error: 'false' });
      }
    };

    const options = items?.map((item) => (
      <Combobox.Option value={item.id} key={item.id}>
        {item.label}
      </Combobox.Option>
    ));

    useImperativeHandle(ref, () => ({
      close: () => {
        combobox.closeDropdown();
      },
      focus: () => {
        combobox.openDropdown();
      },
      blur: () => {
        customVariableLabel();
      },
      onKeyDown: ({ event }) => {
        if (event.key === 'Escape') {
          combobox.closeDropdown();

          return true;
        }
        if (event.key === 'ArrowDown') {
          combobox.selectNextOption();

          return true;
        }
        if (event.key === 'ArrowRight') {
          customVariableLabel();

          return true;
        }
        if (event.code === 'Space') {
          customVariableLabel();

          return true;
        }
        if (event.key === 'ArrowUp') {
          combobox.selectPreviousOption();

          return true;
        }

        if (event.key === 'Enter') {
          combobox.clickSelectedOption();

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
      <Combobox
        store={combobox}
        classNames={suggestionListClassNames}
        withinPortal={false}
        onOptionSubmit={(suggestionId) => {
          handleCommand(suggestionId);
          combobox.closeDropdown();
        }}
      >
        <Combobox.DropdownTarget>
          <VisuallyHidden
            style={{
              position: 'absolute',
              top: clientRect?.()?.bottom,
              left: clientRect?.()?.left,
            }}
          />
        </Combobox.DropdownTarget>
        <Combobox.Dropdown>
          <Combobox.Options>
            {options.length > 0 ? (
              options
            ) : (
              <Combobox.Empty>
                <Text>Nothing found</Text>
              </Combobox.Empty>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>,
      document.body
    );
  }
);
