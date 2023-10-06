import { useState } from 'react';
import { EmailContentCard } from './EmailContentCard';
import { useAuthContext } from '../../../../components/providers/AuthProvider';
import { When } from '../../../../components/utils/When';
import { Preview } from '../../editor/Preview';
import { EditorPreviewSwitch } from '../EditorPreviewSwitch';
import { Grid, SegmentedControl, useMantineTheme } from '@mantine/core';
import { TestSendEmail } from './TestSendEmail';
import { colors } from '../../../../design-system';
import { MobileIcon } from '../../editor/PreviewSegment/MobileIcon';
import { WebIcon } from '../../editor/PreviewSegment/WebIcon';
import { useHotkeys } from '@mantine/hooks';
import { VariablesManagement } from './variables-management/VariablesManagement';
import {
  useHasActiveIntegrations,
  useGetPrimaryIntegration,
  useIntegrationLimit,
  useVariablesManager,
  useEnvController,
} from '../../../../hooks';
import { VariableManagerModal } from '../VariableManagerModal';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import { TranslateProductLead } from '../TranslateProductLead';
import { ChannelTypeEnum } from '@novu/shared';
import { LackIntegrationAlert } from '../LackIntegrationAlert';

export enum ViewEnum {
  EDIT = 'Edit',
  PREVIEW = 'Preview',
  TEST = 'Test',
}
const templateFields = ['content', 'htmlContent', 'subject', 'preheader', 'senderName'];

export function EmailMessagesCards({ index }: { index: number }) {
  const { currentOrganization } = useAuthContext();
  const [view, setView] = useState<ViewEnum>(ViewEnum.EDIT);
  const [preview, setPreview] = useState<'mobile' | 'web'>('web');
  const theme = useMantineTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const variablesArray = useVariablesManager(index, templateFields);
  const { isLimitReached } = useIntegrationLimit(ChannelTypeEnum.EMAIL);
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.EMAIL,
  });
  const { primaryIntegration } = useGetPrimaryIntegration({
    channelType: ChannelTypeEnum.EMAIL,
  });
  const { environment } = useEnvController();
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
        <TestSendEmail isIntegrationActive={hasActiveIntegration} index={index} />
      </When>
      <When truthy={view === ViewEnum.EDIT}>
        <Grid grow>
          <Grid.Col span={9}>
            <EmailContentCard key={index} organization={currentOrganization} index={index} />
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
