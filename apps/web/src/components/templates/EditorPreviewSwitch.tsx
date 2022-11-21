import { SegmentedControl } from '@mantine/core';
import { colors } from '../../design-system';
import { ViewEnum } from '../../pages/templates/editor/TemplateEditorPage';

export const EditorPreviewSwitch = ({ view, setView }) => {
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
      data={Object.values(ViewEnum)}
      value={view}
      onChange={(value) => {
        setView(value);
      }}
      defaultValue={view}
    />
  );
};
