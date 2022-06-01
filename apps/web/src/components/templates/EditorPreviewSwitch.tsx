import { SegmentedControl } from '@mantine/core';
import { colors } from '../../design-system';

export const EditorPreviewSwitch = ({ view, setView }) => {
  if (true) {
    return null;
  }

  return (
    <SegmentedControl
      styles={{
        root: {
          background: 'transparent',
          border: `1px solid ${colors.B40}`,
          borderRadius: '30px',
        },
        control: {
          width: '70px',
        },
        active: {
          background: colors.white,
          borderRadius: '30px',
        },
        labelActive: {
          color: `${colors.B40} !important`,
        },
      }}
      data={['Edit', 'Preview']}
      value={view}
      onChange={(value) => {
        console.log(value);

        setView(value);
      }}
      defaultValue={view}
    />
  );
};
