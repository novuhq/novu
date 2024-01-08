import { useEffect, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { TextAlignEnum } from '@novu/shared';

import { colors } from '@novu/design-system';
import { useEnvController } from '../../../../hooks';
import type { IForm } from '../formTypes';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import { AutoSuggestionsDropdown } from './AutoSuggestionsDropdown';
import { getHotkeyHandler, useHotkeys } from '@mantine/hooks';
import { set } from 'cypress/types/lodash';

export function TextRowContent({ blockIndex }: { blockIndex: number }) {
  const methods = useFormContext<IForm>();
  const stepFormPath = useStepFormPath();

  const content = methods.watch(`${stepFormPath}.template.content.${blockIndex}.content`);
  const textAlign = methods.watch(`${stepFormPath}.template.content.${blockIndex}.styles.textAlign`);
  const { readonly } = useEnvController();
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState<string>(content);
  const [visiblePlaceholder, setVisiblePlaceholder] = useState(!!content);
  const [showAutoSuggestions, setShowAutoSuggestions] = useState(false);
  const [autoSuggestionsCoordinates, setAutoSuggestionsCoordinates] = useState({
    top: 0,
    left: 0,
  });

  const [isAutoSuggestionTrigger, setIsAutoSuggestionTrigger] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState<number | null>(null);
  const [variableQuery, setVariableQuery] = useState('');
  const [contentSnapshot, setContentSnapshot] = useState('');

  useEffect(() => {
    if (isAutoSuggestionTrigger) {
      const checkAutoSuggestionsTrigger = () => {
        const data = content;
        const result = getCaretCoordinatesAndAchorOffset(ref.current);
        if (!result?.anchorOffset || !data) return;

        const characters = checkPreviousChar(data, result?.anchorOffset);

        if (characters && characters.previousChar === '{' && characters.currentChar === '{') {
          setShowAutoSuggestions(true);
          setContentSnapshot(data);
          setAutoSuggestionsCoordinates({
            top: result?.top || 0,
            left: result?.left || 0,
          });

          setIsAutoSuggestionTrigger(false);
          setAnchorPosition(result?.anchorOffset);
        }
      };

      checkAutoSuggestionsTrigger();
    }
  }, [content, isAutoSuggestionTrigger]);

  const checkPreviousChar = (data: string, anchorPos: number) => {
    if (anchorPos > 1) {
      const endContent = data.slice(anchorPos);

      const contentToUse = endContent ? endContent : data;
      const slicePositions = contentToUse.indexOf('{{') + 2;

      const currentChar = contentToUse.charAt(slicePositions - 1);
      const previousChar = contentToUse.charAt(slicePositions - 2);

      return {
        previousChar,
        currentChar,
      };
    }

    return undefined;
  };

  const getCaretCoordinatesAndAchorOffset = (element) => {
    const selection = document.getSelection();
    const caretRange = selection?.getRangeAt(0);
    const caretRect = caretRange?.getBoundingClientRect();
    const parentRect = element.getBoundingClientRect();
    const preSelectionRange = caretRange?.cloneRange();
    preSelectionRange?.selectNodeContents(element);
    if (caretRect && caretRange) {
      preSelectionRange?.setEnd(caretRange.startContainer, caretRange.startOffset);
      const startOffset = preSelectionRange?.toString().length;

      return {
        top: caretRect.top - parentRect.top,
        left: caretRect.left - parentRect.left,
        anchorOffset: startOffset,
      };
    }
  };

  const onSuggestionsSelect = (value: string) => {
    const data = contentSnapshot;

    if (!data || anchorPosition === null) return;

    const endContent = data.slice(anchorPosition);

    const slicePositions = endContent.indexOf('{{') + 2;
    const newEndContent = `${endContent.slice(0, slicePositions)}${value}${endContent.slice(slicePositions)}`;

    const newContent = `${data.slice(0, anchorPosition)}${newEndContent}`;

    methods.setValue(`${stepFormPath}.template.content.${blockIndex}.content`, newContent);
    setText(newContent);
    resetAutoSuggestions();
  };

  const resetAutoSuggestions = () => {
    setShowAutoSuggestions(false);
    setIsAutoSuggestionTrigger(false);
    setAnchorPosition(null);
    setVariableQuery('');
    setContentSnapshot('');
  };

  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

  function checkPlaceholderVisibility(data = content) {
    let showPlaceHolder = !data;

    if (data === '<br>') showPlaceHolder = true;

    setVisiblePlaceholder(showPlaceHolder);
  }

  useEffect(() => {
    if (content !== ref.current?.innerHTML) {
      setText(content);
    }
  }, [content]);

  useEffect(() => {
    checkPlaceholderVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, text]);

  return (
    <div style={{ position: 'relative' }}>
      {showAutoSuggestions && (
        <AutoSuggestionsDropdown
          autoSuggestionsCoordinates={autoSuggestionsCoordinates}
          onSuggestionsSelect={onSuggestionsSelect}
          variableQuery={variableQuery}
        />
      )}
      <Controller
        name={`${stepFormPath}.template.content.${blockIndex}.content`}
        defaultValue=""
        control={methods.control}
        render={({ field }) => {
          return (
            <div
              ref={ref}
              data-test-id="editable-text-content"
              role="textbox"
              dangerouslySetInnerHTML={{
                __html: text,
              }}
              contentEditable={!readonly}
              suppressContentEditableWarning
              onKeyUp={(e: any) => {
                const html = e.target.innerHTML;
                field.onChange(html);
                checkPlaceholderVisibility(html);
                if (showAutoSuggestions) {
                  const variableTyped = diffStrings(contentSnapshot, html);
                  setVariableQuery(variableTyped);
                }
              }}
              onKeyDown={getHotkeyHandler([
                ['shift+{', () => setIsAutoSuggestionTrigger(true), { preventDefault: false }],
                [
                  'shift+}',
                  () => {
                    if (showAutoSuggestions) {
                      resetAutoSuggestions();
                    }
                  },
                  { preventDefault: false },
                ],
                [
                  'ArrowLeft',
                  () => {
                    if (showAutoSuggestions) {
                      resetAutoSuggestions();
                    }
                  },
                  { preventDefault: false },
                ],
                [
                  'ArrowRight',
                  () => {
                    if (showAutoSuggestions) {
                      resetAutoSuggestions();
                    }
                  },
                  { preventDefault: false },
                ],
                [
                  'Escape',
                  (e) => {
                    e.stopPropagation();
                    if (showAutoSuggestions) {
                      resetAutoSuggestions();
                    }
                  },
                ],
              ])}
              style={{
                outline: 'none',
                width: '100%',
                backgroundColor: 'transparent',
                textAlign: textAlign || TextAlignEnum.LEFT,
              }}
              onClick={() => {
                if (showAutoSuggestions) {
                  resetAutoSuggestions();
                }
              }}
            />
          );
        }}
      />
      <PlaceHolder color={colors.B60} show={visiblePlaceholder}>
        Type the email content here...
      </PlaceHolder>
    </div>
  );
}

const PlaceHolder = styled.div<{ show: boolean; color: string }>`
  position: absolute;
  color: ${({ color }) => color};
  z-index: 1;
  top: 0px;
  pointer-events: none;
  display: ${({ show }) => (show ? 'block' : 'none')};
`;

function diffStrings(a: string, b: string) {
  let pointer1 = 0;
  let pointer2 = 0;
  let diff = '';

  while (pointer1 < a.length && pointer2 < b.length) {
    if (a[pointer1] !== b[pointer2]) {
      diff += b[pointer2];
      pointer2++;
    } else {
      pointer1++;
      pointer2++;
    }
  }

  // If string b is longer than string a, append the remaining characters to diff
  if (pointer2 < b.length) {
    diff += b.slice(pointer2);
  }

  return diff;
}
