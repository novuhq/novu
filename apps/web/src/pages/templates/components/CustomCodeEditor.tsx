import './CustomCodeEditor.css';
import { Editor, Monaco } from '@monaco-editor/react';
import { Card, Loader, useMantineColorScheme } from '@mantine/core';
import { useCallback, useEffect, useRef } from 'react';
import { colors } from '@novu/design-system';
import { editor as NEditor } from 'monaco-editor';

import { createTranslationMarks } from './createTranslationMarks';
import { IVariable, useWorkflowVariables } from '../../../api/hooks';
import { useEnvController } from '@novu/shared-web';

export const CustomCodeEditor = ({
  onChange,
  value,
  height = '300px',
}: {
  onChange?: (string) => void;
  value?: string;
  height?: string;
}) => {
  const { allVariables, variables, isLoading: isLoadingVariables } = useWorkflowVariables();

  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  if (isLoadingVariables) {
    return (
      <Card data-test-id={'custom-code-editor'} withBorder sx={styledCard}>
        <Loader />
      </Card>
    );
  }

  return (
    <Card data-test-id={'custom-code-editor'} withBorder sx={styledCard}>
      <CustomCodeEditorBase
        isDark={isDark}
        allVariables={allVariables}
        variables={variables}
        onChange={onChange}
        value={value}
        height={height}
      />
    </Card>
  );
};

const CustomCodeEditorBase = ({
  onChange,
  value,
  height = '300px',
  allVariables,
  variables,
  isDark,
}: {
  onChange?: (string) => void;
  value?: string;
  height?: string;
  allVariables: IVariable[];
  variables: any;
  isDark: boolean;
}) => {
  const { readonly } = useEnvController();

  const editorRef = useRef<NEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decoratorsRef = useRef<NEditor.IEditorDecorationsCollection | null>(null);

  useEffect(() => {
    if (monacoRef.current === null) {
      return;
    }
    monacoRef.current.editor.setTheme(isDark ? 'novu-dark' : 'novu');
  }, [isDark]);

  const getSuggestions = useCallback(
    (monaco, range) => allVariables.map((el) => ({ ...el, kind: monaco.languages.CompletionItemKind.Function, range })),
    [allVariables]
  );

  return (
    <Editor
      value={value}
      height={height}
      onChange={(newValue) => {
        if (!onChange) {
          return;
        }
        onChange(newValue);
        const decorators = createTranslationMarks(newValue, variables);
        decoratorsRef.current?.set(decorators);
      }}
      defaultLanguage="handlebars"
      defaultValue={''}
      theme={isDark ? 'vs-dark' : 'vs'}
      onMount={(editor, monaco) => {
        const decorators = editor.createDecorationsCollection([]);

        const handle = monaco.languages.registerCompletionItemProvider('handlebars', {
          triggerCharacters: ['{'],
          provideCompletionItems: function (model, position) {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            const suggestions = getSuggestions(monaco, range);

            return {
              suggestions: suggestions,
            };
          },
        });

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
            'editor.background': colors.white,
            'editor.lineHighlightBackground': colors.B98,
            'editorSuggestWidget.background': colors.white,
            'editorSuggestWidget.foreground': colors.B98,
            'editorSuggestWidget.selectedBackground': colors.B98,
            'editorSuggestWidget.highlightForeground': colors.B98,
          },
        });

        monaco.editor.setTheme(themeName);

        decoratorsRef.current = decorators;
        editorRef.current = editor;
        monacoRef.current = monaco;
        editor.onDidDispose(() => handle?.dispose());
      }}
      options={{
        minimap: {
          enabled: false,
        },
        // workaround from: https://github.com/microsoft/monaco-editor/issues/2093
        accessibilitySupport: 'off',
        glyphMargin: true,
        renderLineHighlight: 'all',
        fontSize: 14,
        lineHeight: 20,
        readOnly: readonly,
      }}
      className={isDark ? 'custom-code-editor-dark' : 'custom-code-editor'}
    />
  );
};

const styledCard = (theme) => ({
  backgroundColor: 'transparent',
  borderRadius: '7px',
  borderColor: theme.colorScheme === 'dark' ? colors.B30 : colors.B80,
  padding: '30px',
  overflow: 'visible',
  height: '300px',
});
