import styled from '@emotion/styled';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { getHotkeyHandler } from '@mantine/hooks';
import { TextAlignEnum } from '@novu/shared';
import { colors } from '@novu/design-system';

import { useEnvController } from '../../../../hooks';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import type { IForm } from '../formTypes';
import { AutoSuggestionsDropdown } from './AutoSuggestionsDropdown';
import { useWorkflowVariables } from '../../../../api/hooks';

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
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { allVariables } = useWorkflowVariables();

  const variablesList = useMemo(() => {
    if (variableQuery) {
      return allVariables.filter((variable) => variable.label.toLowerCase().includes(variableQuery.toLowerCase()));
    }

    return allVariables;
  }, [variableQuery, allVariables]);

  useEffect(() => {
    if (isAutoSuggestionTrigger) {
      const checkAutoSuggestionsTrigger = () => {
        const data = content;
        const result = getCaretCoordinatesAndAnchorOffset(ref.current);
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
      const endContent = data.slice(anchorPos - 2);

      const contentToUse = endContent ? endContent : data;
      const slicePositions = contentToUse.lastIndexOf('{') + 1;

      const currentChar = contentToUse.charAt(slicePositions - 1);
      const previousChar = contentToUse.charAt(slicePositions - 2);

      return {
        previousChar,
        currentChar,
      };
    }

    return undefined;
  };

  const getCaretCoordinatesAndAnchorOffset = (element) => {
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

    const slicePositions = endContent.lastIndexOf('{{') + 2;
    const newEndContent = `${endContent.slice(0, slicePositions)}${value}${endContent.slice(slicePositions)}`;

    const newContent = `${data.slice(0, anchorPosition)}${newEndContent}`;
    setText(newContent);

    methods.setValue(`${stepFormPath}.template.content.${blockIndex}.content`, newContent);
    resetAutoSuggestions();
  };

  const resetAutoSuggestions = () => {
    setShowAutoSuggestions(false);
    setIsAutoSuggestionTrigger(false);
    setAnchorPosition(null);
    setVariableQuery('');
    setContentSnapshot('');
    setSelectedIndex(0);
    ref.current?.blur();
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
          selectedIndex={selectedIndex}
          variablesList={variablesList}
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
                [
                  'ArrowUp',
                  (e) => {
                    if (showAutoSuggestions) {
                      e.stopPropagation();
                      setSelectedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
                    }
                  },
                  { preventDefault: showAutoSuggestions },
                ],
                [
                  'ArrowDown',
                  (e) => {
                    if (showAutoSuggestions) {
                      e.stopPropagation();
                      setSelectedIndex((prevIndex) => Math.min(prevIndex + 1, variablesList.length - 1));
                    }
                  },
                  {
                    preventDefault: showAutoSuggestions,
                  },
                ],
                [
                  'Enter',
                  () => {
                    if (showAutoSuggestions) {
                      onSuggestionsSelect(variablesList[selectedIndex].insertText);
                    }
                  },
                  {
                    preventDefault: showAutoSuggestions,
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
