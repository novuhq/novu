import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-handlebars';
import 'ace-builds/src-noconflict/theme-monokai';
import { addCompleter } from 'ace-builds/src-noconflict/ext-language_tools';
import { Card } from '@mantine/core';
import { SystemVariablesWithTypes, HandlebarHelpers } from '@novu/shared';
import { colors } from '@novu/design-system';
import { useEnvController } from '../../../../hooks';

export function EmailCustomCodeEditor({
  onChange,
  value,
  height = '300px',
}: {
  onChange?: (string) => void;
  value?: string;
  height?: string;
}) {
  const { readonly } = useEnvController();
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

  return (
    <Card withBorder sx={styledCard}>
      <AceEditor
        data-test-id="custom-code-editor"
        style={{ width: '100%' }}
        mode="handlebars"
        theme="monokai"
        name="codeEditor"
        onChange={onChange}
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
        }}
      />
    </Card>
  );
}

const styledCard = (theme) => ({
  backgroundColor: 'transparent',
  borderRadius: '7px',
  borderColor: theme.colorScheme === 'dark' ? colors.B30 : colors.B80,
  padding: '30px',
});
