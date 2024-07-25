import { Grid, SegmentedControl, useMantineTheme } from '@mantine/core';
import { colors, When } from '@novu/design-system';
import { useState } from 'react';

import { InAppPreview } from '../../../../components/workflow/preview';
import { useEnvironment } from '../../../../hooks';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import { VariablesManagement } from '../email-editor/variables-management/VariablesManagement';
import { ControlVariablesForm } from '../ControlVariablesForm';
import { useTemplateEditorForm } from '../TemplateEditorFormProvider';
import { AvatarFeedFields } from './AvatarFeedFields';
import { InAppEditorBlock } from './InAppEditorBlock';

const EDITOR = 'Editor';
const PREVIEW = 'Preview';
const CONTROLS = 'Controls';

export function InAppContentCard({ openVariablesModal }: { openVariablesModal: () => void }) {
  const { template } = useTemplateEditorForm();
  const { readonly, bridge } = useEnvironment({ bridge: template?.bridge });
  const theme = useMantineTheme();

  const [activeTab, setActiveTab] = useState<string>(bridge ? PREVIEW : EDITOR);
  const stepFormPath = useStepFormPath();

  return (
    <div data-test-id="editor-type-selector">
      {!bridge ? (
        <SegmentedControl
          data-test-id="editor-mode-switch"
          styles={{
            root: {
              background: 'transparent',
              border: `1px solid ${theme.colorScheme === 'dark' ? colors.B40 : colors.B70}`,
              borderRadius: '30px',
              width: '100%',
              maxWidth: '300px',
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
          data={bridge ? [PREVIEW] : [EDITOR, PREVIEW]}
          value={activeTab}
          onChange={(value) => {
            setActiveTab(value);
          }}
          defaultValue={activeTab}
          fullWidth
          radius={'xl'}
        />
      ) : null}

      <When truthy={activeTab === CONTROLS}>
        <ControlVariablesForm />
      </When>
      <When truthy={activeTab === PREVIEW}>
        <div style={{ marginTop: '1.5rem' }}>
          <InAppPreview showVariables />
        </div>
      </When>
      <When truthy={activeTab === EDITOR}>
        <Grid mt={24} grow>
          <Grid.Col span={9}>
            <InAppEditorBlock readonly={readonly} />
            <AvatarFeedFields />
          </Grid.Col>
          <Grid.Col
            span={3}
            style={{
              maxWidth: '350px',
            }}
          >
            <VariablesManagement
              bridge={bridge}
              path={`${stepFormPath}.template.variables`}
              openVariablesModal={openVariablesModal}
            />
          </Grid.Col>
        </Grid>
      </When>
    </div>
  );
}
