import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-handlebars';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/worker-css';
import { addCompleter } from 'ace-builds/src-noconflict/ext-language_tools';
import { Card } from '@mantine/core';
import { SystemVariablesWithTypes, HandlebarHelpers } from '@novu/shared';
import { colors } from '../../../../design-system';
import { useEnvController } from '../../../../hooks';
import { useState, useEffect } from 'react';

export function EmailCustomCodeEditor({
  onChange,
  value,
  height = '300px',
}: {
  onChange?: (newValue: string) => void;
  value?: string;
  height?: string;
}) {
  const { readonly } = useEnvController();
  const [hasEmptyStyle, setHasEmptyStyle] = useState(false);

  useEffect(() => {
    addCompleter({
      getCompletions: function (editor, session, pos, prefix, callback) {
        const systemVars = Object.keys(SystemVariablesWithTypes)
          .map((name) => {
            const type = SystemVariablesWithTypes[name];
            if (typeof type === 'object') {
              return Object.keys(type).map((subName) => {
                return { name: `${name}.${subName}`, type: type[subName] };
              });
            }

            return { name, type };
          })
          .flat();

        callback(null, [
          ...Object.keys(HandlebarHelpers).map((name) => {
            return { name, value: name, caption: name, meta: HandlebarHelpers[name].description };
          }),
          ...systemVars.map(({ name, type }) => {
            return { name, value: name, caption: name, meta: type };
          }),
        ]);
      },
    });
  }, []);

  const handleChange = (newValue: string) => {
    const emptyStyleRegex = /<style\s*(?:type="text\/css"\s*)?><\/style>/i;
    const isEmptyStyle = emptyStyleRegex.test(newValue);
    setHasEmptyStyle(isEmptyStyle);
    onChange?.(newValue);
  };

  return (
    <Card withBorder sx={styledCard}>
      <AceEditor
        data-test-id="custom-code-editor"
        style={{ width: '100%' }}
        mode="handlebars"
        theme="monokai"
        name="codeEditor"
        onChange={handleChange}
        height={height}
        fontSize={14}
        showPrintMargin
        showGutter
        highlightActiveLine
        value={value ? String(value) : ''}
        setOptions={{
          enableBasicAutocompletion: true,
          enableLiveAutocompletion: true,
          enableSnippets: true,
          showLineNumbers: true,
          tabSize: 1,
          readOnly: readonly,
          useWorker: true, // enable csslint
        }}
        editorProps={{ $blockScrolling: true }}
      />
      {hasEmptyStyle && <div style={{ color: 'red', marginTop: '10px' }}>Style element cannot be empty</div>}
    </Card>
  );
}

const styledCard = (theme: any) => ({
  backgroundColor: 'transparent',
  borderRadius: '7px',
  borderColor: theme.colorScheme === 'dark' ? colors.B30 : colors.B80,
  padding: '30px',
});
