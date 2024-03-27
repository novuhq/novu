import { SegmentedControl, useMantineTheme } from '@mantine/core';
import { colors } from '@novu/design-system';
import { useMemo } from 'react';
import { ViewEnum } from './email-editor/EmailMessagesCards';

export const EditorPreviewSwitch = ({ view, setView, chimera = false }) => {
  const theme = useMantineTheme();

  const views = useMemo(() => {
    const all = Object.values(ViewEnum);

    if (chimera) {
      return all.filter((item) => item !== ViewEnum.CODE && item !== ViewEnum.EDIT && item !== ViewEnum.INPUTS);
    }

    return all.filter((item) => item !== ViewEnum.CODE && item !== ViewEnum.INPUTS);
  }, [chimera]);

  return (
    <SegmentedControl
      data-test-id="editor-mode-switch"
      styles={{
        root: {
          background: 'transparent',
          border: `1px solid ${theme.colorScheme === 'dark' ? colors.B40 : colors.B70}`,
          borderRadius: '30px',
          width: '100%',
          maxWidth: chimera ? '400px' : '300px',
        },
        label: {
          fontSize: '14px',
          lineHeight: '24px',
        },
        control: {
          minWidth: '80px',
        },
        active: {
          background: theme.colorScheme === 'dark' ? colors.B40 : colors.B98,
          borderRadius: '30px',
        },
        labelActive: {
          color: `${theme.colorScheme === 'dark' ? colors.white : colors.B40} !important`,
          fontSize: '14px',
          lineHeight: '24px',
        },
      }}
      data={views}
      value={view}
      onChange={(value) => {
        setView(value);
      }}
      defaultValue={view}
      fullWidth
      radius={'xl'}
    />
  );
};
