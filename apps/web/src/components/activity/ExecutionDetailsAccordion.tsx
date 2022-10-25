import { Accordion, useMantineColorScheme } from '@mantine/core';
import { ExecutionDetailsStatusEnum } from '@novu/shared';
import styled from 'styled-components';

import { ExecutionDetailsStepContent } from './ExecutionDetailsStepContent';
import { ExecutionDetailsStepHeader } from './ExecutionDetailsStepHeader';

import { colors, shadows } from '../../design-system';

const calculateStyle = (theme) => {
  const style = {
    chevron: {
      backgroundColor: `${theme.colorScheme === 'dark' ? colors.white : colors.B40}`,
    },
    control: {
      padding: '15px 25px',
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
  };

  return style;
};

export const ExecutionDetailsAccordion = ({ steps }) => {
  const theme = useMantineColorScheme();
  const style = calculateStyle(theme);

  if (!steps || steps.length <= 0) {
    return null;
  }

  return (
    <Accordion key="execution-details-accordion" iconPosition="right" styles={style}>
      {steps.map((step) => (
        <Accordion.Item label={<ExecutionDetailsStepHeader key={`execution-details-step-${step.id}`} step={step} />}>
          <ExecutionDetailsStepContent key={`execution-details-step-content-${step.id}`} step={step} />
        </Accordion.Item>
      ))}
    </Accordion>
  );
};
