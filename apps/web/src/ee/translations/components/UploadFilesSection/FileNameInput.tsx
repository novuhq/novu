import { Group } from '@mantine/core';
import { Input } from '@novu/design-system';
import React, { useEffect } from 'react';
import { useEditTranslationFileContext } from '../../context/useEditTranslationFileContext';
import { CodeBracketOutlined } from '../../icons';

export function FileNameInput({ currentFileName, readonly }: { currentFileName: string; readonly: boolean }) {
  const { setFileName, fileName } = useEditTranslationFileContext();

  useEffect(() => {
    setFileName(currentFileName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFileName]);

  return (
    <Group align="center" spacing={12} noWrap>
      <div>
        <CodeBracketOutlined />
      </div>
      <div style={{ flex: 1 }}>
        <Input
          value={fileName || ''}
          onChange={(e) => {
            setFileName(e.target.value);
          }}
          placeholder="File name"
          error={fileName === ''}
          disabled={readonly}
        />
      </div>
    </Group>
  );
}
