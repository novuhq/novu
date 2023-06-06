import { Alert, Container, Group, MantineTheme, Modal, Space, useMantineTheme, TextInput } from '@mantine/core';
import { IEmailBlock } from '@novu/shared';
import { useFormContext } from 'react-hook-form';
import { WarningOutlined } from '@ant-design/icons';

import { Button, colors, shadows, Text, Title } from '../../../design-system';

const TextItalics = ({ children }) => (
  <i>
    <b>{children}</b>
  </i>
);

const Description = () => (
  <Container>
    <Text size={'lg'}>Please provide some context so we can generate content tailored to your template!</Text>
    <Space h="sm" />
  </Container>
);

const PreContextMessage = ({ colorScheme, workflowContext }) => {
  const { channel, workflow } = workflowContext;
  const { name, emailSubject, templateName } = workflow;

  return (
    <Container styles={(theme) => ({ color: colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[6] })}>
      <Text>
        We are creating <TextItalics>{templateName}</TextItalics> template with the title{' '}
        <TextItalics>{emailSubject}</TextItalics> for our workflow <TextItalics>{name}</TextItalics> to be delivered as{' '}
        <TextItalics>{channel}</TextItalics>
      </Text>
      <Space h="sm" />
    </Container>
  );
};

const ContextMessage = ({ colorScheme, onChange }) => {
  return (
    <Container>
      <Text size={'lg'}>What would you want the outcome of this to be?</Text>
      <Space h="sm" />
      <TextInput
        styles={(theme) => ({
          root: {
            flex: '1 1 auto',
          },
          wrapper: {
            background: 'transparent',
            width: '100%',
          },
          input: {
            background: 'transparent',
            borderStyle: 'solid',
            borderColor: colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5],
            borderWidth: '1px',
            fontSize: '20px',
            fontWeight: 'bolder',
            padding: 9,
            lineHeight: '28px',
            minHeight: 'auto',
            height: 'auto',
            width: '100%',
            textOverflow: 'ellipsis',
            '&:not(:placeholder-shown)': {
              borderStyle: 'none',
              color: colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[6],
              padding: 10,
            },
            '&:hover, &:focus': {
              borderStyle: 'none',
              color: colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[6],
              padding: 10,
            },
            '&:disabled': {
              backgroundColor: colorScheme === 'dark' ? colors.B17 : theme.white,
              color: colorScheme === 'dark' ? theme.white : theme.black,
              opacity: 1,
            },
          },
        })}
        onChange={onChange}
        type="text"
        placeholder="I would like to..."
      />
    </Container>
  );
};

export function GenerateContentContextModal({
  workflowContext,
  target,
  isOpen,
  cancel,
  confirm,
  confirmButtonText = 'Yes',
  cancelButtonText = 'No',
  isLoading,
  onChange,
  error,
}: {
  workflowContext: any;
  target?: string;
  isOpen: boolean;
  cancel: () => void;
  confirm: () => void;
  onChange: (event: any) => void;
  isLoading?: boolean;
  error?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}) {
  const theme = useMantineTheme();
  const colorScheme = theme.colorScheme;
  const targetText = target ? ' ' + target : '';

  return (
    <>
      <Modal
        opened={isOpen}
        overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
        overlayOpacity={0.7}
        styles={{
          modal: {
            backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
          },
          body: {
            paddingTop: '5px',
          },
          inner: {
            paddingTop: '180px',
          },
        }}
        title={<Title>Content will be generated! ✍️</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
        onClose={() => {
          cancel();
        }}
      >
        <div>
          {error && (
            <Alert
              icon={<WarningOutlined size={16} />}
              title="An error occurred!"
              color={`linear-gradient(0deg, ${colors.B17} 0%, ${colors.B17} 100%)`}
              mb={32}
            >
              {error}
            </Alert>
          )}
          <Description />
          <PreContextMessage colorScheme={colorScheme} workflowContext={workflowContext} />
          <ContextMessage onChange={onChange} colorScheme={colorScheme} />
          <Group position="right">
            <Button variant="outline" size="md" mt={30} onClick={() => cancel()}>
              {cancelButtonText}
            </Button>
            <Button mt={30} size="md" onClick={() => confirm()} loading={isLoading} data-autofocus>
              {confirmButtonText}
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  );
}
