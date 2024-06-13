import styled from '@emotion/styled';
import { Center, Grid, useMantineTheme } from '@mantine/core';
import { DiffEditor, Monaco } from '@monaco-editor/react';

import { colors, Text } from '@novu/design-system';
import React, { useEffect, useRef } from 'react';
import { FileEditEditor } from './FileEditEditor';

export function FilesDiffSection({
  text,
  original = '',
  readonly,
  setIsValidJsonFile,
}: {
  text: string;
  original?: string;
  readonly: boolean;
  setIsValidJsonFile: (isValid: boolean) => void;
}) {
  const { colorScheme } = useMantineTheme();
  const isDark = colorScheme === 'dark';
  const keys = Object.keys(JSON.parse(text)).length;
  const origKeys = original.length ? Object.keys(JSON.parse(original)).length : 0;
  const monacoRef = useRef<Monaco | null>(null);

  useEffect(() => {
    if (monacoRef.current === null) {
      return;
    }
    monacoRef.current.editor.setTheme(isDark ? 'novu-dark' : 'novu');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorScheme]);

  if (!text) return null;
  if (!original) return <FileEditEditor value={text} setIsValidJsonFile={setIsValidJsonFile} readonly={readonly} />;

  return (
    <div>
      <KeysContainer isDark={isDark}>
        <Grid w={'100%'} gutter={0}>
          <Grid.Col span={6}>
            <Center inline>
              <Text color={colors.B40}>Existing file</Text>
              <Text ml={8} color={colors.B60}>
                {origKeys} keys
              </Text>
            </Center>
          </Grid.Col>
          <Grid.Col span={6}>
            <Center inline>
              <Text color={colors.B40}>Uploading file</Text>
              <Text ml={8} color={colors.B60}>
                {keys} keys
              </Text>
            </Center>
          </Grid.Col>
        </Grid>
      </KeysContainer>
      <div>
        <DiffEditor
          theme={isDark ? 'vs-dark' : 'vs'}
          height="400px"
          original={original}
          modified={text}
          language={'json'}
          onMount={(editor, monaco) => {
            const themeName = isDark ? 'novu-dark' : 'novu';
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
          }}
          options={{
            minimap: {
              enabled: false,
            },
            // workaround from: https://github.com/microsoft/monaco-editor/issues/2093
            accessibilitySupport: 'off',
            renderLineHighlight: 'all',
            scrollBeyondLastLine: false,
            enableSplitViewResizing: false,
            fontSize: 14,
            lineHeight: 20,
            originalEditable: false,
            readOnly: readonly,
          }}
        />
      </div>
    </div>
  );
}

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
