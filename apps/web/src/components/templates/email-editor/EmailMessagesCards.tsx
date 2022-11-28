import { useContext, useState } from 'react';
import { EmailContentCard } from './EmailContentCard';
import { AuthContext } from '../../../store/authContext';
import { When } from '../../utils/When';
import { Preview } from '../../../pages/templates/editor/Preview';
import { EditorPreviewSwitch } from '../EditorPreviewSwitch';
import { Grid, Group, Modal, SegmentedControl, Title, useMantineTheme } from '@mantine/core';
import { TestSendEmail } from './TestSendEmail';
import { colors, shadows } from '../../../design-system';
import { MobileIcon } from '../../../pages/templates/editor/PreviewSegment/MobileIcon';
import { WebIcon } from '../../../pages/templates/editor/PreviewSegment/WebIcon';
import { UnstyledButton } from '@mantine/core';
import { ChevronRight } from '../../../design-system/icons/arrows/ChevronRight';
import { ChevronLeft } from '../../../design-system/icons/arrows/ChevronLeft';
import { useHotkeys } from '@mantine/hooks';
import { VariableManager } from '../VariableManager';
import { VariablesManagement } from './variables-management/VariablesManagement';

export enum ViewEnum {
  EDIT = 'Edit',
  PREVIEW = 'Preview',
  TEST = 'Test',
}

export function EmailMessagesCards({
  index,
  variables,
  isIntegrationActive,
}: {
  index: number;
  variables: { name: string }[];
  isIntegrationActive: boolean;
}) {
  const { currentOrganization } = useContext(AuthContext);
  const [view, setView] = useState<ViewEnum>(ViewEnum.EDIT);
  const [preview, setPreview] = useState<'mobile' | 'web'>('web');
  const theme = useMantineTheme();
  const [showVarManagement, setShowVarManagement] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

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
      <Group position="apart" mb={view === ViewEnum.PREVIEW ? 40 : 20}>
        <div>
          <EditorPreviewSwitch view={view} setView={setView} />
        </div>
        <When truthy={view === ViewEnum.PREVIEW}>
          <div>
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
              data={[
                {
                  value: 'web',
                  label: <WebIcon />,
                },
                {
                  value: 'mobile',
                  label: <MobileIcon />,
                },
              ]}
              value={preview}
              onChange={(value: any) => {
                setPreview(value);
              }}
              defaultValue={preview}
              fullWidth
            />
          </div>
        </When>
        <When truthy={view === ViewEnum.EDIT}>
          <div>
            <UnstyledButton
              type="button"
              onClick={() => {
                setShowVarManagement(!showVarManagement);
              }}
            >
              {showVarManagement ? <ChevronRight /> : <ChevronLeft />}
            </UnstyledButton>
          </div>
        </When>
      </Group>
      <When truthy={view === ViewEnum.PREVIEW}>
        <Preview activeStep={index} view={preview} />
      </When>
      <When truthy={view === ViewEnum.TEST}>
        <TestSendEmail isIntegrationActive={isIntegrationActive} index={index} />
      </When>
      <When truthy={view === ViewEnum.EDIT}>
        <Grid grow>
          <Grid.Col span={showVarManagement ? 8 : 12}>
            <EmailContentCard
              key={index}
              organization={currentOrganization}
              variables={variables}
              index={index}
              isIntegrationActive={isIntegrationActive}
            />
          </Grid.Col>
          <Grid.Col
            span={showVarManagement ? 4 : 0}
            sx={{
              maxWidth: '325px',
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
      <Modal
        opened={modalOpen}
        overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
        overlayOpacity={0.7}
        styles={{
          modal: {
            backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
            width: '90%',
          },
          body: {
            paddingTop: '5px',
            paddingInline: '8px',
          },
        }}
        title={<Title>Variables</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
        onClose={() => {
          setModalOpen(false);
        }}
        centered
        overflow="inside"
      >
        <VariableManager hideLabel={true} index={index} contents={['content', 'htmlContent', 'subject']} />
      </Modal>
    </>
  );
}
