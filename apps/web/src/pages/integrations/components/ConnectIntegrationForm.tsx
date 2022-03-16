import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import styled from '@emotion/styled';
import { IProviderConfig } from '@notifire/shared';
import { Button, colors, Input, Switch, Text } from '../../../design-system';
import { Check } from '../../../design-system/icons';

export function ConnectIntegrationForm({ provider }: { provider: IProviderConfig | null }) {
  const { handleSubmit, control } = useForm();

  return (
    // eslint-disable-next-line no-console
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <ColumnDiv>
        <InlineDiv>
          <span style={{ marginRight: 5 }}>Read our guide on where to get the credentials </span>
          <a href={provider?.docReference}>here</a>
        </InlineDiv>
        {provider?.credentials.map((credential) => (
          <Controller
            control={control}
            name=" "
            render={() => <Input label={credential.key} required data-test-id={credential.key} />}
          />
        ))}
        <RowDiv>
          <ActiveWrapper>
            <Switch />
            <StyledText>Active</StyledText>
          </ActiveWrapper>
          <ConnectedWrapper>
            <StyledText>Connected</StyledText>
            <Check />
          </ConnectedWrapper>
        </RowDiv>
        <Button fullWidth>Connect</Button>
      </ColumnDiv>
    </form>
  );
}

const StyledText = styled(Text)`
  display: inline-block;
  word-break: normal;
  margin: 0 6px;
`;

const SideElementBase = styled.div`
  display: flex;
  justify-content: flex-start;
`;

const ActiveWrapper = styled(SideElementBase)`
  ${StyledText} {
    color: red;
  }
`;

const ColumnDiv = styled.div`
  display: flex;
  flex-direction: column;
`;

const RowDiv = styled.div`
  justify-content: space-between;
  display: flex;
  flex-direction: row;
  margin: 30px 0 30px 0;
`;

const InlineDiv = styled.div`
  display: flex;
  flex-direction: row;
`;

const ConnectedWrapper = styled(SideElementBase)`
  ${StyledText} {
    color: ${colors.success};
  }
`;
