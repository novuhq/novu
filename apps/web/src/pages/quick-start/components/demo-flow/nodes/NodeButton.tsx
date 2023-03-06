import React from 'react';
import styled from '@emotion/styled';
import { UnstyledButton } from '@mantine/core';

import { useStyles } from '../../../../../design-system/template-button/TemplateButton.styles';
import { colors, Text } from '../../../../../design-system';

export function NodeButton({
  data,
  id,
  Handlers,
  Icon,
  ActionItem,
}: {
  data: any;
  id: string;
  Handlers: React.FC<any>;
  Icon: React.FC<any>;
  ActionItem?: React.FC<any>;
}) {
  const { theme } = useStyles();

  return (
    <>
      <Button
        data-test-id={`data-test-id-${data.label}`}
        sx={{
          backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.white,
        }}
      >
        <ButtonContent>
          <ButtonLeftContent>
            <Icon style={{ marginRight: '15px' }} />
            <Text weight={'bold'}>{data.label} </Text>
          </ButtonLeftContent>
          {ActionItem ? <ActionItem /> : null}
        </ButtonContent>
      </Button>
      <Handlers />
    </>
  );
}

const ButtonContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ButtonLeftContent = styled.div`
  display: flex;
  align-items: center;
`;

const Button: any = styled(UnstyledButton)`
  position: relative;

  width: 300px;
  height: 75px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  border-radius: 7px;
  pointer-events: none;

  margin: 0;
  padding: 20px;

  @media screen and (max-width: 1400px) {
    padding: 0 5px;
  }
`;
