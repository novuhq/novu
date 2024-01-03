import './CustomCodeEditor.css';
import { Editor } from '@monaco-editor/react';
import { Card, Loader } from '@mantine/core';
import { useCallback, useRef } from 'react';
import { HandlebarHelpers } from '@novu/shared';
import { colors } from '@novu/design-system';
import { getWorkflowVariables } from '../../../api/notification-templates';
import { useQuery } from '@tanstack/react-query';

export const CustomCodeEditor = ({
  onChange,
  value,
  height = '300px',
}: {
  onChange?: (string) => void;
  value?: string;
  height?: string;
}) => {
  const { data: variables, isLoading: isLoadingVariables } = useQuery(['getVariables'], () => getWorkflowVariables(), {
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  if (isLoadingVariables) {
    return (
      <Card withBorder sx={styledCard}>
        <Loader />
      </Card>
    );
  }

  return (
    <Card withBorder sx={styledCard}>
      <CustomCodeEditorBase variables={variables} onChange={onChange} value={value} height={height} />
    </Card>
  );
};

const CustomCodeEditorBase = ({
  onChange,
  value,
  height = '300px',
  variables,
}: {
  onChange?: (string) => void;
  value?: string;
  height?: string;
  variables: any;
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decoratorsRef = useRef<any>(null);
  const getSuggestions = useCallback(
    (monaco, range) => {
      const systemVars = Object.keys(variables)
        .map((key) => {
          const subVariables = variables[key];

          return Object.keys(subVariables)
            .map((name) => {
              const type = subVariables[name];
              if (typeof type === 'object') {
                return Object.keys(type).map((subName) => {
                  return {
                    label: `${key === 'translations' ? 'i18n ' : ''}${name}.${subName}`,
                    kind: monaco.languages.CompletionItemKind.Variable,
                    detail: type[subName],
                    insertText: `${name}.${subName}`,
                    range: range,
                  };
                });
              }

              return {
                label: `${key === 'translations' ? 'i18n ' : ''}${name}`,
                kind: monaco.languages.CompletionItemKind.Variable,
                detail: type,
                insertText: name,
                range: range,
              };
            })
            .flat();
        })
        .flat();

      return [
        ...Object.keys(HandlebarHelpers).map((name) => ({
          label: name,
          kind: monaco.languages.CompletionItemKind.Function,
          detail: HandlebarHelpers[name].description,
          insertText: name,
          range: range,
        })),
        ...systemVars,
      ];
    },
    [variables]
  );

  return (
    <Editor
      height={height}
      onChange={(newValue) => {
        if (!onChange) {
          return;
        }
        onChange(newValue);
      }}
      defaultLanguage="handlebars"
      defaultValue={value}
      theme="vs-dark"
      onMount={(editor, monaco) => {
        const decorators = editor.createDecorationsCollection([]);

        monaco.languages.registerCompletionItemProvider('handlebars', {
          triggerCharacters: ['{', '.'],
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

        monaco.editor.setTheme('novu-dark');

        decoratorsRef.current = decorators;
        editorRef.current = editor;
        monacoRef.current = monaco;
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
      }}
    />
  );
};

const styledCard = (theme) => ({
  backgroundColor: 'transparent',
  borderRadius: '7px',
  borderColor: theme.colorScheme === 'dark' ? colors.B30 : colors.B80,
  padding: '30px',
});
