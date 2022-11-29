import { SegmentedControl, useMantineTheme } from '@mantine/core';
import { colors } from '../../design-system';
import { ViewEnum } from './email-editor/EmailMessagesCards';

export const EditorPreviewSwitch = ({ view, setView }) => {
  const theme = useMantineTheme();

  return (
    <SegmentedControl
      styles={{
        root: {
          background: 'transparent',
          border: `1px solid ${theme.colorScheme === 'dark' ? colors.B40 : colors.B70}`,
          borderRadius: '30px',
        },
        control: {
          width: '70px',
        },
        active: {
          background: theme.colorScheme === 'dark' ? colors.white : colors.B98,
          borderRadius: '30px',
        },
        labelActive: {
          color: `${colors.B40} !important`,
        },
      }}
      data={Object.values(ViewEnum)}
      value={view}
      onChange={(value) => {
        setView(value);
      }}
      defaultValue={view}
    />
  );
};
