import { useContext, useState } from 'react';
import { EmailContentCard } from './EmailContentCard';
import { AuthContext } from '../../../store/authContext';
import { When } from '../../utils/When';
import { Preview } from '../../../pages/templates/editor/Preview';
import { EditorPreviewSwitch } from '../EditorPreviewSwitch';
import { Grid, Group, Modal, SegmentedControl, Title, useMantineTheme } from '@mantine/core';
import { TestSendEmail } from './TestSendEmail';
import { Button, colors, shadows } from '../../../design-system';
import { MobileIcon } from '../../../pages/templates/editor/PreviewSegment/MobileIcon';
import { WebIcon } from '../../../pages/templates/editor/PreviewSegment/WebIcon';
import { useHotkeys } from '@mantine/hooks';
import { VariableManager } from '../VariableManager';
import { VariablesManagement } from './variables-management/VariablesManagement';
import { useVariablesManager } from '../../../hooks/use-variables-manager';

export enum ViewEnum {
  EDIT = 'Edit',
  PREVIEW = 'Preview',
  TEST = 'Test',
}

export function EmailMessagesCards({ index, isIntegrationActive }: { index: number; isIntegrationActive: boolean }) {
  const { currentOrganization } = useContext(AuthContext);
  const [view, setView] = useState<ViewEnum>(ViewEnum.EDIT);
  const [preview, setPreview] = useState<'mobile' | 'web'>('web');
  const theme = useMantineTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const variablesArray = useVariablesManager(index, ['content', 'htmlContent', 'subject']);

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
        <Grid mb={view === ViewEnum.PREVIEW ? 40 : 20}>
          <Grid.Col span={6}>
            <Grid justify="right" mr={7}>
              <EditorPreviewSwitch view={view} setView={setView} />
            </Grid>
          </Grid.Col>
          <Grid.Col p={0} span={6}>
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
        <VariableManager hideLabel={true} index={index} variablesArray={variablesArray} />
        <Group position="right">
          <Button
            data-test-id="close-var-manager-modal"
            mt={30}
            onClick={() => {
              setModalOpen(false);
            }}
          >
            Close
          </Button>
        </Group>
      </Modal>
    </>
  );
}
