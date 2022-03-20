import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-handlebars';
import 'ace-builds/src-noconflict/theme-monokai';
import { Card } from '@mantine/core';
import React from 'react';
import { colors } from '../../../design-system';

export function EmailCustomCodeEditor({ onChange, value }: { onChange?: (string) => void; value?: string }) {
  return (
    <Card withBorder sx={styledCard}>
      <AceEditor
        data-test-id="custom-code-editor"
        style={{ width: '100%' }}
        mode="handlebars"
        theme="monokai"
        name="codeEditor"
        onChange={onChange}
        height="300px"
        fontSize={14}
        showPrintMargin
        showGutter
        highlightActiveLine
        value={value ? String(value) : ''}
        setOptions={{
          enableBasicAutocompletion: true,
          enableLiveAutocompletion: false,
          enableSnippets: true,
          showLineNumbers: true,
          tabSize: 1,
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
