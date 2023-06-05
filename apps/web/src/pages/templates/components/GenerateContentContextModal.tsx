import { Alert, Container, Group, MantineTheme, Modal, Space, useMantineTheme, TextInput } from '@mantine/core';
import { IEmailBlock } from '@novu/shared';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { WarningOutlined } from '@ant-design/icons';

import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';
import { Button, colors, shadows, Text, Title } from '../../../design-system';
import type { IForm, IFormStep, ITemplates } from './formTypes';

interface IStepEntityExtended extends IFormStep {
  template: ITemplates & {
    content: IEmailBlock[];
  };
}

interface IFormExtended extends IForm {
  steps: IStepEntityExtended[];
}

const TextItalics = ({ children }) => (
  <i>
    <b>{children}</b>
  </i>
);

const Description = () => (
  <Container>
    <Text size={'lg'}>Provide us with more context so we can help you to redact your content</Text>
    <Space h="sm" />
  </Container>
);

const PreContextMessage = ({ colorScheme, stepIndex, template }) => {
  const { watch } = useFormContext<IFormExtended>();
  const stepName = watch(`steps.${stepIndex}.name`);
  const channel = watch(`steps.${stepIndex}.template.type`);
  const subject = watch(`steps.${stepIndex}.template.subject`);

  const workflowName = template?.name;

  return (
    <Container styles={(theme) => ({ color: colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[6] })}>
      <Text>
        We are creating <TextItalics>{stepName}</TextItalics> template with the title{' '}
        <TextItalics>{subject}</TextItalics> for our workflow <TextItalics>{workflowName}</TextItalics> to be delivered
        as <TextItalics>{channel}</TextItalics>
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
  target,
  stepIndex,
  isOpen,
  cancel,
  confirm,
  confirmButtonText = 'Yes',
  cancelButtonText = 'No',
  isLoading,
  onChange,
  error,
}: {
  stepIndex: number;
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
  const { template } = useTemplateEditorForm();
  const theme = useMantineTheme();
  const colorScheme = theme.colorScheme;
  const targetText = target ? ' ' + target : '';

  const workflowName = template?.name;

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
          <PreContextMessage colorScheme={colorScheme} stepIndex={stepIndex} template={template} />
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
