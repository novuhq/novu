import { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { useMantineTheme, Tabs } from '@mantine/core';
import { Editor, Monaco } from '@monaco-editor/react';
import { editor as NEditor } from 'monaco-editor';

import { colors } from '@novu/design-system';
import { BrowserScreenWrapper } from './TitleBarWrapper';

export function CodeEditor({
  files,
  setFiles,
  readonly,
  language = 'javascript',
}: {
  files: { [key: string]: string };
  setFiles: (files: { [key: string]: string }) => void;
  readonly?: boolean;
  language?: string;
}) {
  const { colorScheme } = useMantineTheme();
  const monacoRef = useRef<Monaco | null>(null);
  const decoratorsRef = useRef<NEditor.IEditorDecorationsCollection | null>(null);
  const [activeTab, setActiveTab] = useState(Object.keys(files)[0]);

  useEffect(() => {
    if (monacoRef.current === null) {
      return;
    }

    monacoRef.current.editor.setTheme('novu-dark');
  }, [colorScheme]);

  return (
    <BrowserScreenWrapper title="Your IDE">
      <Tabs
        value={activeTab}
        onTabChange={(value) => setActiveTab(value as string)}
        classNames={{
          root: css({
            height: '100% !important',
          }),
          panel: css({
            height: '100% !important',
          }),
          tab: css({
            height: '32px !important',
            borderRadius: '0 !important',
            borderTop: '2px solid transparent',
            '&[data-active]': {
              borderTop: '2px solid #3CB179',
            },
          }),
        }}
      >
        <Tabs.List>
          {Object.keys(files).map((fileName) => (
            <Tabs.Tab key={fileName} value={fileName}>
              {fileName}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {Object.entries(files).map(([fileName, code]) => (
          <Tabs.Panel key={fileName} value={fileName}>
            <Editor
              defaultLanguage={language}
              theme={'vs-dark'}
              language={language}
              defaultValue={code}
              onChange={(value) => {
                if (readonly) return;

                setFiles({ ...files, [fileName]: value || '' });
              }}
              onMount={(editor, monaco) => {
                const themeName = 'novu-dark';

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

                monaco.editor.setTheme(themeName);
                monacoRef.current = monaco;
                const decorators = editor.createDecorationsCollection([]);

                decoratorsRef.current = decorators;

                /*
                 * setKeys(Object.keys(JSON.parse(code ?? '{}')).length);
                 * setFileText(code);
                 */
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
                readOnly: readonly,
              }}
            />
          </Tabs.Panel>
        ))}
      </Tabs>
    </BrowserScreenWrapper>
  );
}
