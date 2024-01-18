import './CustomCodeEditor.css';
import { Editor, Monaco } from '@monaco-editor/react';
import { Card, Loader, useMantineColorScheme } from '@mantine/core';
import { useCallback, useEffect, useRef } from 'react';
import { HandlebarHelpers } from '@novu/shared';
import { colors } from '@novu/design-system';
import { getWorkflowVariables } from '../../../api/notification-templates';
import { useQuery } from '@tanstack/react-query';
import { editor as NEditor } from 'monaco-editor';
import { createTranslationMarks } from './createTranslationMarks';

export const getTextToInsert = (text, key) => {
  if (key === 'translations') {
    return `i18n "${text}"`;
  }

  return text;
};
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

  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  if (isLoadingVariables) {
    return (
      <Card withBorder sx={styledCard}>
        <Loader />
      </Card>
    );
  }

  return (
    <Card withBorder sx={styledCard}>
      <CustomCodeEditorBase isDark={isDark} variables={variables} onChange={onChange} value={value} height={height} />
    </Card>
  );
};

const CustomCodeEditorBase = ({
  onChange,
  value,
  height = '300px',
  variables,
  isDark,
}: {
  onChange?: (string) => void;
  value?: string;
  height?: string;
  variables: any;
  isDark: boolean;
}) => {
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
                    insertText: getTextToInsert(`${name}.${subName}`, key),
                    range: range,
                  };
                });
              }

              return {
                label: `${key === 'translations' ? 'i18n ' : ''}${name}`,
                kind: monaco.languages.CompletionItemKind.Variable,
                detail: type,
                insertText: getTextToInsert(name, key),
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
        const decorators = createTranslationMarks(newValue, variables);
        decoratorsRef.current?.set(decorators);
      }}
      defaultLanguage="handlebars"
      defaultValue={value}
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
});
