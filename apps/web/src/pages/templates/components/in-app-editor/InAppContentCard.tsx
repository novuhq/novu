import { useFormContext, useWatch } from 'react-hook-form';
import { colors, Tabs } from '../../../../design-system';
import { useEnvController, useProcessVariables } from '../../../../hooks';
import { InAppEditorBlock } from './InAppEditorBlock';
import { Grid, useMantineTheme, JsonInput } from '@mantine/core';
import { VariablesManagement } from '../email-editor/variables-management/VariablesManagement';
import { inputStyles } from '../../../../design-system/config/inputs.styles';
import { useState, useEffect } from 'react';
import { AvatarFeedFields } from './AvatarFeedFields';

const EDITOR = 'Editor';
const PREVIEW = 'Preview';

export function InAppContentCard({ index, openVariablesModal }: { index: number; openVariablesModal: () => void }) {
  const { readonly } = useEnvController();
  const { control } = useFormContext();
  const theme = useMantineTheme();
  const [payloadValue, setPayloadValue] = useState('{}');
  const [activeTab, setActiveTab] = useState<string>(EDITOR);

  const variables = useWatch({
    name: `steps.${index}.template.variables`,
    control,
  });

  const processedVariables = useProcessVariables(variables);

  useEffect(() => {
    setPayloadValue(processedVariables);
  }, [processedVariables, setPayloadValue]);

  const onTabChange = (value: string | null) => {
    if (value === null) {
      return;
    }
    setActiveTab(value);
  };

  const menuTabs = [
    {
      value: EDITOR,
      content: (
        <Grid grow>
          <Grid.Col span={9}>
            <InAppEditorBlock control={control as any} index={index} readonly={readonly} />
            <AvatarFeedFields control={control} index={index} />
          </Grid.Col>
          <Grid.Col
            span={3}
            mb={20}
            style={{
              maxWidth: '350px',
            }}
          >
            <VariablesManagement openVariablesModal={openVariablesModal} index={index} />
          </Grid.Col>
        </Grid>
      ),
    },
    {
      value: PREVIEW,
      content: (
        <Grid mb={20}>
          <Grid.Col span={9} p={0}>
            <div style={{ maxWidth: '450px', margin: '0 auto' }}>
              <InAppEditorBlock
                control={control as any}
                payload={payloadValue}
                index={index}
                readonly={true}
                preview={true}
              />
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
              }}
            >
              <JsonInput
                data-test-id="preview-json-param"
                formatOnBlur
                autosize
                styles={inputStyles}
                label="Payload:"
                value={payloadValue}
                onChange={setPayloadValue}
                minRows={6}
                mb={20}
                validationError="Invalid JSON"
              />
            </div>
          </Grid.Col>
        </Grid>
      ),
    },
  ];

  return (
    <div data-test-id="editor-type-selector">
      <Tabs value={activeTab} onTabChange={onTabChange} menuTabs={menuTabs} />
    </div>
  );
}
