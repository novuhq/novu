import { Editor } from '@monaco-editor/react';
import { Card } from '@mantine/core';
import { useRef } from 'react';
import { HandlebarHelpers, SystemVariablesWithTypes } from '@novu/shared';
import { colors } from '@novu/design-system';

export const CustomCodeEditor = ({
  onChange,
  value,
  height = '300px',
}: {
  onChange?: (string) => void;
  value?: string;
  height?: string;
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decoratorsRef = useRef<any>(null);

  return (
    <Card withBorder sx={styledCard}>
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

              const systemVars = Object.keys(SystemVariablesWithTypes)
                .map((name) => {
                  const type = SystemVariablesWithTypes[name];
                  if (typeof type === 'object') {
                    return Object.keys(type).map((subName) => {
                      return {
                        label: `${name}.${subName}`,
                        kind: monaco.languages.CompletionItemKind.Variable,
                        documentation: type[subName],
                        insertText: `${name}.${subName}`,
                        range: range,
                      };
                    });
                  }

                  return {
                    label: name,
                    kind: monaco.languages.CompletionItemKind.Variable,
                    documentation: type,
                    insertText: name,
                    range: range,
                  };
                })
                .flat();

              const suggestions = [
                ...Object.keys(HandlebarHelpers).map((name) => ({
                  label: name,
                  kind: monaco.languages.CompletionItemKind.Function,
                  documentation: HandlebarHelpers[name].description,
                  insertText: name,
                  range: range,
                })),
                ...systemVars,
              ];

              return {
                suggestions: suggestions.filter((suggestion) => suggestion.label.includes(word.word)),
              };
            },
          });

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
        }}
      />
    </Card>
  );
};

const styledCard = (theme) => ({
  backgroundColor: 'transparent',
  borderRadius: '7px',
  borderColor: theme.colorScheme === 'dark' ? colors.B30 : colors.B80,
  padding: '30px',
});
