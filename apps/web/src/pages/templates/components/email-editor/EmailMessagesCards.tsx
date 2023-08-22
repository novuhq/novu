import { useState } from 'react';
import { EmailContentCard } from './EmailContentCard';
import { useAuthContext } from '../../../../components/providers/AuthProvider';
import { When } from '../../../../components/utils/When';
import { Preview } from '../../editor/Preview';
import { EditorPreviewSwitch } from '../EditorPreviewSwitch';
import { Grid, Group, SegmentedControl, useMantineTheme } from '@mantine/core';
import { TestSendEmail } from './TestSendEmail';
import { colors } from '../../../../design-system';
import { MobileIcon } from '../../editor/PreviewSegment/MobileIcon';
import { WebIcon } from '../../editor/PreviewSegment/WebIcon';
import { useHotkeys } from '@mantine/hooks';
import { VariablesManagement } from './variables-management/VariablesManagement';
import { useVariablesManager } from '../../../../hooks';
import { VariableManagerModal } from '../VariableManagerModal';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import { TranslateProductLead } from '../TranslateProductLead';

export enum ViewEnum {
  EDIT = 'Edit',
  PREVIEW = 'Preview',
  TEST = 'Test',
}
const templateFields = ['content', 'htmlContent', 'subject', 'preheader', 'senderName'];

export function EmailMessagesCards({ index, isIntegrationActive }: { index: number; isIntegrationActive: boolean }) {
  const { currentOrganization } = useAuthContext();
  const [view, setView] = useState<ViewEnum>(ViewEnum.EDIT);
  const [preview, setPreview] = useState<'mobile' | 'web'>('web');
  const theme = useMantineTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const variablesArray = useVariablesManager(index, templateFields);

  useHotkeys([
    [
      '1',
      () => {
        setView(ViewEnum.EDIT);
      },
    ],
    [
      '2',
      () => {
        setView(ViewEnum.PREVIEW);
        setPreview('web');
      },
    ],
    [
      '3',
      () => {
        setView(ViewEnum.TEST);
      },
    ],
    [
      '4',
      () => {
        setView(ViewEnum.PREVIEW);
        setPreview('mobile');
      },
    ],
  ]);

  return (
    <>
      <div
        style={{
          position: 'relative',
        }}
      >
        <StepSettings index={index} />
        <Grid m={0} mt={24}>
          <Grid.Col p={0} mr={20} span={7}>
            <EditorPreviewSwitch view={view} setView={setView} />
          </Grid.Col>
          <Grid.Col p={0} span={2}>
            <When truthy={view === ViewEnum.PREVIEW}>
              <SegmentedControl
                data-test-id="preview-mode-switch"
                styles={{
                  root: {
                    background: 'transparent',
                    border: `1px solid ${theme.colorScheme === 'dark' ? colors.B40 : colors.B70}`,
                    borderRadius: '30px',
                    marginLeft: 7,
                  },
                  control: {
                    width: '70px',
                  },
                  active: {
                    background: theme.colorScheme === 'dark' ? colors.B40 : colors.B98,
                    borderRadius: '30px',
                  },
                  labelActive: {
                    color: `${theme.colorScheme === 'dark' ? colors.white : colors.B40} !important`,
                  },
                }}
                radius={'xl'}
                data={[
                  {
                    value: 'web',
                    label: <WebIcon color={preview !== 'web' ? colors.B40 : undefined} />,
                  },
                  {
                    value: 'mobile',
                    label: (
                      <MobileIcon style={{ marginTop: 3 }} color={preview !== 'mobile' ? colors.B40 : undefined} />
                    ),
                  },
                ]}
                value={preview}
                onChange={(value: any) => {
                  setPreview(value);
                }}
                defaultValue={preview}
              />
            </When>
          </Grid.Col>
        </Grid>
      </div>
      <When truthy={view === ViewEnum.PREVIEW}>
        <Preview activeStep={index} view={preview} />
      </When>
      <When truthy={view === ViewEnum.TEST}>
        <TestSendEmail isIntegrationActive={isIntegrationActive} index={index} />
      </When>
      <When truthy={view === ViewEnum.EDIT}>
        <Grid grow>
          <Grid.Col span={9}>
            <EmailContentCard
              key={index}
              organization={currentOrganization}
              index={index}
              isIntegrationActive={isIntegrationActive}
            />
            <TranslateProductLead
              id="translate-email-editor"
              style={{
                marginTop: 32,
              }}
            />
          </Grid.Col>
          <Grid.Col
            span={3}
            style={{
              maxWidth: '350px',
            }}
          >
            <VariablesManagement
              index={index}
              openVariablesModal={() => {
                setModalOpen(true);
              }}
            />
          </Grid.Col>
        </Grid>
      </When>
      <VariableManagerModal index={index} setOpen={setModalOpen} open={modalOpen} variablesArray={variablesArray} />
    </>
  );
}
