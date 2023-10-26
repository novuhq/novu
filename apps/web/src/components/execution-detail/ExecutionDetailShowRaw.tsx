import styled from '@emotion/styled';
import { Container, Group, useMantineColorScheme } from '@mantine/core';
import { Prism } from '@mantine/prism';
import { Button, colors, Text, Close } from '@novu/design-system';
import { When } from '../utils/When';
import { ExecutionDetailsConditions } from './ExecutionDetailsConditions';

const ExecutionDetailShowRawWrapper = styled(Container)`
  display: flex;
  flex-flow: column;
  margin: 0;
  padding: 0;
  vertical-align: middle;
`;

const DetailTitle = styled(Text)`
  font-size: 14px;
  font-weight: 700;
  line-height: 17px;
  padding-bottom: 20px;
`;

const ActionButton = styled(Button)`
  background-color: transparent;
  background-image: none;
  border: 1px solid ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B80)};
  border-radius: 7px;
  box-shadow: none;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B40)};
  font-size: 12px;
  font-weight: 700;
  height: 30px;
  padding: 0;
  width: 95px;
`;

const CloseButton = styled(Button)`
  background-color: transparent;
  background-image: none;
  border-radius: 30px;
  box-shadow: none;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B40)};
  display: flex;
  height: 15px;
  margin: 0;
  padding: 0;
  position: relative;
  top: -10px;
`;

export const ExecutionDetailShowRaw = ({ onShowExecutionDetail, onHideExecutionDetail, showTriggerSnippet }) => {
  const action = showTriggerSnippet ? onShowExecutionDetail : onHideExecutionDetail;
  const label = showTriggerSnippet ? 'Show detail' : 'Close detail';

  const onClick = () => {
    action();
  };

  return <ActionButton onClick={onClick}>{label}</ActionButton>;
};

export const ExecutionDetailRawSnippet = ({ raw, onClose }) => {
  const theme = useMantineColorScheme();

  const prismStyles = {
    code: {
      fontWeight: 400,
      color: `${colors.B60} !important`,
      backgroundColor: 'transparent !important',
      border: `1px solid ${theme.colorScheme === 'dark' ? colors.B70 : colors.B30}`,
      borderRadius: '7px',
    },
  };

  const parsedValue = JSON.parse(raw);

  return (
    <ExecutionDetailShowRawWrapper>
      <Group position="apart">
        <DetailTitle>Detail</DetailTitle>
        <CloseButton onClick={onClose}>
          <Close />
        </CloseButton>
      </Group>
      <When truthy={parsedValue && parsedValue.conditions && parsedValue.conditions.length}>
        <ExecutionDetailsConditions conditions={parsedValue.conditions} />
      </When>
      <Prism
        colorScheme={theme.colorScheme}
        mt={5}
        styles={prismStyles}
        data-test-id="execution-detail-raw-snippet"
        language="json"
      >
        {JSON.stringify(parsedValue, null, 2)}
      </Prism>
    </ExecutionDetailShowRawWrapper>
  );
};
