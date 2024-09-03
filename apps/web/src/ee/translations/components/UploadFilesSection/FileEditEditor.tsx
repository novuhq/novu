/* eslint-disable max-len */
import { css, cx } from '@emotion/css';
import styled from '@emotion/styled';
import { Group, useMantineTheme } from '@mantine/core';
import { Editor, Monaco } from '@monaco-editor/react';
import { colors, Text } from '@novu/design-system';
import { format } from 'date-fns';
import { editor as NEditor, Range } from 'monaco-editor';
import React, { useEffect, useRef, useState } from 'react';
import { useEditTranslationFileContext } from '../../context/useEditTranslationFileContext';

export function FileEditEditor({
  height = '300px',
  value,
  createdAt,
  updatedAt,
  setIsValidJsonFile,
  readonly,
}: {
  height?: string;
  value: string;
  createdAt?: string;
  updatedAt?: string;
  setIsValidJsonFile: (isValid: boolean) => void;
  readonly: boolean;
}) {
  const { colorScheme } = useMantineTheme();
  const isDark = colorScheme === 'dark';
  const monacoRef = useRef<Monaco | null>(null);
  const decoratorsRef = useRef<NEditor.IEditorDecorationsCollection | null>(null);

  const [errorLineNumbers, setErrorLineNumbers] = useState<number[]>([]);

  const [keys, setKeys] = useState(0);

  useEffect(() => {
    if (monacoRef.current === null) {
      return;
    }
    monacoRef.current.editor.setTheme(colorScheme === 'dark' ? 'novu-dark' : 'novu');
  }, [colorScheme]);

  const { setFileText, fileText } = useEditTranslationFileContext();

  return (
    <div>
      <KeysContainer isDark={isDark}>
        <Text color={colors.B60}>{keys} keys</Text>

        <Group spacing={24} noWrap align="center">
          {createdAt && (
            <Group spacing={5}>
              <Text color={colors.B40}>Created at</Text>
              <Text color={colors.B60}>{format(new Date(createdAt ?? ''), 'dd/MM/yyyy HH:mm')}</Text>
            </Group>
          )}
          {updatedAt && (
            <Group spacing={5}>
              <Text color={colors.B40}>Updated at</Text>
              <Text color={colors.B60}>{format(new Date(updatedAt ?? ''), 'dd/MM/yyyy HH:mm')}</Text>
            </Group>
          )}
        </Group>
      </KeysContainer>
      <Editor
        height={height}
        defaultLanguage="json"
        theme={isDark ? 'vs-dark' : 'vs'}
        language={'json'}
        defaultValue={value}
        onValidate={(markers) => {
          const decorators: NEditor.IModelDeltaDecoration[] = [];
          const errorLines: number[] = [];
          markers.forEach((marker) => {
            const range = new Range(marker.startLineNumber, marker.startColumn, marker.endLineNumber, marker.endColumn);
            errorLines.push(marker.startLineNumber, marker.endLineNumber);
            decorators.push({
              range,
              options: {
                className: cx(errorLineClass),
              },
            });
          });

          setErrorLineNumbers(Array.from(new Set(errorLines)));
          decoratorsRef.current?.set(decorators);
          if (markers.length === 0) {
            setIsValidJsonFile(true);
            setKeys(Object.keys(JSON.parse(fileText ?? '{}')).length);
          } else {
            setIsValidJsonFile(false);
          }
        }}
        onChange={(val) => {
          if (readonly) return;

          setFileText(val!);
        }}
        onMount={(editor, monaco) => {
          const themeName = colorScheme === 'dark' ? 'novu-dark' : 'novu';
          monaco.editor.defineTheme('novu-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
              'editor.background': colors.B20,
              'editor.lineHighlightBackground': colors.B30,
              'editorSuggestWidget.background': colors.B30,
              'editorSuggestWidget.foreground': colors.B60,
              'editorSuggestWidget.selectedBackground': colors.B60,
              'editorSuggestWidget.highlightForeground': colors.B60,
            },
          });

          monaco.editor.defineTheme('novu', {
            base: 'vs',
            inherit: true,
            rules: [],
            colors: {
              'editor.background': colors.BGLight,
              'editor.lineHighlightBackground': colors.B98,
              'editorSuggestWidget.background': colors.white,
              'editorSuggestWidget.foreground': colors.B98,
              'editorSuggestWidget.selectedBackground': colors.B98,
              'editorSuggestWidget.highlightForeground': colors.B98,
            },
          });

          monaco.editor.setTheme(themeName);
          monacoRef.current = monaco;
          const decorators = editor.createDecorationsCollection([]);

          decoratorsRef.current = decorators;

          setKeys(Object.keys(JSON.parse(value ?? '{}')).length);
          setFileText(value);
        }}
        options={{
          minimap: {
            enabled: false,
          },
          // workaround from: https://github.com/microsoft/monaco-editor/issues/2093
          accessibilitySupport: 'off',
          renderLineHighlight: 'all',
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineHeight: 20,
          lineNumbers: (number) => {
            return errorLineNumbers.includes(number) ? ERROR_ICON : `${number}`;
          },
          readOnly: readonly,
        }}
      />
    </div>
  );
}

const errorLineClass = css`
  background-color: rgba(229, 69, 69, 0.4) !important;
`;

const KeysContainer = styled.div<{ isDark: boolean }>`
  display: flex;
  height: 32px;
  padding: 0px 12px;
  padding-right: 30px;
  justify-content: space-between;
  align-items: center;
  background-color: ${({ isDark }) => (isDark ? colors.B15 : colors.B85)};
  border-top-left-radius: 7px;
  border-top-right-radius: 7px;
`;

const ERROR_ICON = `<div style="width: 48px !important; height: 20px !important; margin: 0; padding: 0;">
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
<mask id="mask0_2586_81756" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
  <rect width="20" height="20" fill="#D9D9D9"/>
</mask>
<g mask="url(#mask0_2586_81756)">
  <path d="M10.0003 14.1667C10.2364 14.1667 10.4344 14.0869 10.5941 13.9272C10.7538 13.7674 10.8337 13.5695 10.8337 13.3334C10.8337 13.0973 10.7538 12.8994 10.5941 12.7397C10.4344 12.5799 10.2364 12.5001 10.0003 12.5001C9.76421 12.5001 9.5663 12.5799 9.40658 12.7397C9.24685 12.8994 9.16699 13.0973 9.16699 13.3334C9.16699 13.5695 9.24685 13.7674 9.40658 13.9272C9.5663 14.0869 9.76421 14.1667 10.0003 14.1667ZM9.16699 10.8334H10.8337V5.83341H9.16699V10.8334ZM10.0003 18.3334C8.84755 18.3334 7.76421 18.1147 6.75033 17.6772C5.73644 17.2397 4.85449 16.6459 4.10449 15.8959C3.35449 15.1459 2.76074 14.264 2.32324 13.2501C1.88574 12.2362 1.66699 11.1529 1.66699 10.0001C1.66699 8.8473 1.88574 7.76397 2.32324 6.75008C2.76074 5.73619 3.35449 4.85425 4.10449 4.10425C4.85449 3.35425 5.73644 2.7605 6.75033 2.323C7.76421 1.8855 8.84755 1.66675 10.0003 1.66675C11.1531 1.66675 12.2364 1.8855 13.2503 2.323C14.2642 2.7605 15.1462 3.35425 15.8962 4.10425C16.6462 4.85425 17.2399 5.73619 17.6774 6.75008C18.1149 7.76397 18.3337 8.8473 18.3337 10.0001C18.3337 11.1529 18.1149 12.2362 17.6774 13.2501C17.2399 14.264 16.6462 15.1459 15.8962 15.8959C15.1462 16.6459 14.2642 17.2397 13.2503 17.6772C12.2364 18.1147 11.1531 18.3334 10.0003 18.3334Z" fill="#E64545"/>
</g>
</svg>
</div>`;
