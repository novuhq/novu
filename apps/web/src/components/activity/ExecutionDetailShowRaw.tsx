import { useState } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { Prism } from '@mantine/prism';
import styled from 'styled-components';

import { Button, colors, Text } from '../../design-system';

const DetailTitle = styled(Text)`
  font-size: 14px;
  font-weight: 700;
  line-height: 17px;
  padding-bottom: 20px;
`;

const ActionButton = styled(Button)<{ theme: string }>`
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

export const ExecutionDetailShowRaw = ({ raw, onShowExecutionDetail, onHideExecutionDetail }) => {
  const theme = useMantineColorScheme();
  const [showSnippet, setShowSnippet] = useState<boolean>(false);

  const action = showSnippet ? onHideExecutionDetail : onShowExecutionDetail;
  const label = showSnippet ? 'Close detail' : 'Show detail';

  const onClick = (event) => {
    setShowSnippet((state) => !state);
    action(event, raw);
  };

  return (
    <ActionButton theme={theme} onClick={onClick}>
      {label}
    </ActionButton>
  );
};

export const ExecutionDetailRawSnippet = ({ raw }) => {
  const theme = useMantineColorScheme();

  const prismStyles = {
    code: {
      fontWeight: 400,
      color: `${colors.B60} !important`,
      backgroundColor: 'transparent !important',
      border: ` 1px solid ${theme.colorScheme === 'dark' ? colors.B70 : colors.B30}`,
      borderRadius: '7px',
    },
  };

  return (
    <>
      <DetailTitle>Detail</DetailTitle>
      <Prism
        colorScheme={theme.colorScheme}
        mt={5}
        styles={prismStyles}
        data-test-id="execution-detail-raw-snippet"
        language="json"
      >
        {raw}
      </Prism>
    </>
  );
};
