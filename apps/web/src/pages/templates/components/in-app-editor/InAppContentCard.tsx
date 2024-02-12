import { useState, useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Grid, useMantineTheme, JsonInput, SegmentedControl } from '@mantine/core';
import { colors, inputStyles, When } from '@novu/design-system';

import { useEnvController, useProcessVariables } from '../../../../hooks';
import { InAppEditorBlock } from './InAppEditorBlock';
import { VariablesManagement } from '../email-editor/variables-management/VariablesManagement';
import { AvatarFeedFields } from './AvatarFeedFields';
import { TranslateProductLead } from '../TranslateProductLead';
import { useStepFormPath } from '../../hooks/useStepFormPath';

const EDITOR = 'Editor';
const PREVIEW = 'Preview';

export function InAppContentCard({ openVariablesModal }: { openVariablesModal: () => void }) {
  const { readonly } = useEnvController();
  const { control } = useFormContext();
  const theme = useMantineTheme();
  const [payloadValue, setPayloadValue] = useState('{}');
  const [activeTab, setActiveTab] = useState<string>(EDITOR);
  const stepFormPath = useStepFormPath();
  const variables = useWatch({
    name: `${stepFormPath}.template.variables`,
    control,
  });

  const processedVariables = useProcessVariables(variables);

  useEffect(() => {
    setPayloadValue(processedVariables);
  }, [processedVariables, setPayloadValue]);

  return (
    <div data-test-id="editor-type-selector">
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
        data={[EDITOR, PREVIEW]}
        value={activeTab}
        onChange={(value) => {
          setActiveTab(value);
        }}
        defaultValue={activeTab}
        fullWidth
        radius={'xl'}
      />
      <When truthy={activeTab === PREVIEW}>
        <Grid mt={24} mb={0}>
          <Grid.Col span={9} p={0}>
            <div style={{ margin: '0 10px' }}>
              <InAppEditorBlock payload={payloadValue} readonly={true} preview={true} />
            </div>
          </Grid.Col>
          <Grid.Col span={3} p={0}>
            <div
              style={{
                width: '100%',
                height: '100%',
                background: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
                borderRadius: 7,
                padding: 15,
                paddingTop: 0,
              }}
            >
              <JsonInput
                data-test-id="preview-json-param"
                formatOnBlur
                autosize
                styles={inputStyles}
                label="Payload"
                value={payloadValue}
                onChange={setPayloadValue}
                minRows={6}
                mb={20}
                validationError="Invalid JSON"
              />
            </div>
          </Grid.Col>
        </Grid>
      </When>
      <When truthy={activeTab === EDITOR}>
        <Grid mt={24} grow>
          <Grid.Col span={9}>
            <InAppEditorBlock readonly={readonly} />
            <TranslateProductLead
              id="translate-in-app-editor"
              style={{
                marginTop: 32,
              }}
            />
            <AvatarFeedFields />
          </Grid.Col>
          <Grid.Col
            span={3}
            style={{
              maxWidth: '350px',
            }}
          >
            <VariablesManagement path={`${stepFormPath}.template.variables`} openVariablesModal={openVariablesModal} />
          </Grid.Col>
        </Grid>
      </When>
    </div>
  );
}
