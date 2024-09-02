import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { VisuallyHidden, Combobox, useCombobox } from '@mantine/core';
import { type SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { variableSuggestionList } from '../../../styled-system/recipes';
import { Text } from '../../components';
import { AUTOCOMPLETE_CLOSE_TAG, AUTOCOMPLETE_OPEN_TAG, VariableErrorCode } from '../constants';
import { useInputAutocompleteContext } from '../context';
import { cleanVariableMatch } from '../utils';

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

    const { variablesSet } = useInputAutocompleteContext();

    useEffect(() => {
      combobox.selectFirstOption();
    }, [items]);

    // called on entering the AUTOCOMPLETE_CLOSE_TAG or onBlur of the variable entry
    const customVariableLabel = () => {
      // ensure query has closing characters
      if (!query.endsWith(AUTOCOMPLETE_CLOSE_TAG)) {
        command({ label: `${AUTOCOMPLETE_OPEN_TAG}${query}`, id: '', error: VariableErrorCode.INVALID_SYNTAX });

        return;
      }

      // extract variable name without special closing characters
      const variableName = cleanVariableMatch(query);
      const cleanedQuery = query.slice(0, -AUTOCOMPLETE_CLOSE_TAG.length);

      // set error if the variable is not a valid reference
      if (!variablesSet.has(variableName)) {
        command({ label: cleanedQuery, id: '', error: VariableErrorCode.INVALID_NAME });

        return;
      }

      // happy path -- valid variable reference
      return command({ label: cleanedQuery, id: variableName });
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
          // don't allow Space to close variable entry if the user hasn't typed the closing tag
          if (!query.endsWith(AUTOCOMPLETE_CLOSE_TAG)) {
            return false;
          }
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
      const foundItem = items.find((item) => item.id === id);
      if (!foundItem) {
        return;
      }

      command(foundItem);
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
