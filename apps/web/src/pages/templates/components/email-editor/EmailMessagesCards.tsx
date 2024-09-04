import { useState } from 'react';
import { Grid, SegmentedControl, useMantineTheme } from '@mantine/core';
import { colors } from '@novu/design-system';
import { useHotkeys } from '@mantine/hooks';
import { ChannelTypeEnum } from '@novu/shared';
import { EmailContentCard } from './EmailContentCard';
import { useAuth } from '../../../../hooks/useAuth';
import { When } from '../../../../components/utils/When';
import { EmailPreview } from '../../../../components/workflow/preview';
import { EditorPreviewSwitch } from '../EditorPreviewSwitch';
import { TestSendEmail } from './TestSendEmail';
import { MobileIcon } from '../../../../components/workflow/preview/email/PreviewSegment/MobileIcon';
import { WebIcon } from '../../../../components/workflow/preview/email/PreviewSegment/WebIcon';
import { VariablesManagement } from './variables-management/VariablesManagement';
import {
  useHasActiveIntegrations,
  useGetPrimaryIntegration,
  useIntegrationLimit,
  useVariablesManager,
  useEnvironment,
} from '../../../../hooks';
import { EditVariablesModal } from '../EditVariablesModal';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import { LackIntegrationAlert } from '../LackIntegrationAlert';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import { useTemplateEditorForm } from '../TemplateEditorFormProvider';

export enum ViewEnum {
  EDIT = 'Edit',
  PREVIEW = 'Preview',
  CODE = 'Code',
  CONTROLS = 'Controls',
  TEST = 'Test',
}
const templateFields = ['content', 'htmlContent', 'subject', 'preheader', 'senderName'];

export function EmailMessagesCards() {
  const { currentOrganization } = useAuth();
  const { template } = useTemplateEditorForm();
  const { environment, bridge } = useEnvironment({ bridge: template?.bridge });
  const [view, setView] = useState<ViewEnum>(bridge ? ViewEnum.PREVIEW : ViewEnum.EDIT);
  const [preview, setPreview] = useState<'mobile' | 'web'>('web');
  const theme = useMantineTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const variablesArray = useVariablesManager(templateFields);
  const { isLimitReached } = useIntegrationLimit(ChannelTypeEnum.EMAIL);
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.EMAIL,
  });
  const { primaryIntegration } = useGetPrimaryIntegration({
    channelType: ChannelTypeEnum.EMAIL,
  });
  const stepFormPath = useStepFormPath();

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
        {!hasActiveIntegration && isLimitReached && <LackIntegrationAlert channelType={ChannelTypeEnum.EMAIL} />}
        {hasActiveIntegration && !primaryIntegration && (
          <LackIntegrationAlert
            channelType={ChannelTypeEnum.EMAIL}
            text={`You have multiple provider instances for Email in the ${environment?.name} environment.
            Please select the primary instance.`}
            isPrimaryMissing
          />
        )}
        <StepSettings />
        <Grid m={0} mt={24}>
          <Grid.Col p={0} mr={20} span={7}>
            <EditorPreviewSwitch view={view} setView={setView} bridge={bridge} />
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
        <EmailPreview view={preview} />
      </When>
      <When truthy={view === ViewEnum.TEST}>
        <TestSendEmail bridge={bridge} isIntegrationActive={hasActiveIntegration} />
      </When>
      <When truthy={view === ViewEnum.EDIT}>
        <Grid grow>
          <Grid.Col span={9}>
            {}
            <EmailContentCard organization={currentOrganization!} />
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
              openVariablesModal={() => {
                setModalOpen(true);
              }}
            />
          </Grid.Col>
        </Grid>
      </When>
      <EditVariablesModal setOpen={setModalOpen} open={modalOpen} variablesArray={variablesArray} />
    </>
  );
}
