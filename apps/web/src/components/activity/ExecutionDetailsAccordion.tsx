import { Accordion, createStyles } from '@mantine/core';

import { ExecutionDetailsStepContent } from './ExecutionDetailsStepContent';
import { ExecutionDetailsStepHeader } from './ExecutionDetailsStepHeader';

import { colors } from '../../design-system';

const useStyles = createStyles((theme) => ({
  chevron: {
    backgroundColor: `${theme.colorScheme === 'dark' ? colors.white : colors.B40}`,
  },
  control: {
    paddingBottom: '15px',
    paddingLeft: '25px',
    paddingRight: '25px',
    paddingTop: '15px',
    '&:hover': {
      borderRadius: '7px',
    },
  },
  item: {
    border: `1px solid ${theme.colorScheme === 'dark' ? colors.B30 : colors.B85}`,
    marginBottom: '15px',
    borderRadius: '7px',
    color: `${colors.B80}`,
    padding: '0',
  },
  itemOpened: {
    border: `1px solid ${theme.colorScheme === 'dark' ? colors.B60 : colors.B70}`,
  },
  icon: {
    backgroundColor: `${theme.colorScheme === 'dark' ? colors.B20 : colors.BGLight}`,
    borderRadius: '50px',
    height: '30px',
    width: '30px',
  },
}));

export const ExecutionDetailsAccordion = ({ identifier, steps, subscriberVariables }) => {
  const { classes } = useStyles();

  if (!steps || steps.length <= 0) {
    return null;
  }

  return (
    <Accordion key="execution-details-accordion" iconPosition="right" classNames={classes}>
      {steps.map((step) => (
        <Accordion.Item key={`execution-details-step-${step.id}`} label={<ExecutionDetailsStepHeader step={step} />}>
          <ExecutionDetailsStepContent
            key={`execution-details-step-content-${step.id}`}
            identifier={identifier}
            step={step}
            subscriberVariables={subscriberVariables}
          />
        </Accordion.Item>
      ))}
    </Accordion>
  );
};
