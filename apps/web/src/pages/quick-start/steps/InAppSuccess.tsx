import styled from '@emotion/styled';
import { Group, Stack } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../components/layout/components/PageContainer';
import { SandBoxSetupSuccess } from '../../../components/quick-start/in-app-onboarding/SandboxSetupSuccess';
import { ROUTES } from '../../../constants/routes.enum';
import { Button, colors } from '../../../design-system';
import { successScreenSecondaryTitle, successScreenTitle } from '../consts';

export function InAppSuccess() {
  return (
    <PageContainer
      style={{
        minHeight: '90%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '42px 30px',
      }}
    >
      <Stack>
        <Stack spacing={8}>
          <Title>{successScreenTitle}</Title>
          <SecondaryTitle>{successScreenSecondaryTitle}</SecondaryTitle>
        </Stack>
        <Group position="center">
          <ActionItem />
        </Group>
      </Stack>
      <SetupWrapper>
        <SandBoxSetupSuccess />
      </SetupWrapper>
    </PageContainer>
  );
}

function ActionItem() {
  const navigate = useNavigate();

  return (
    <Button
      variant="gradient"
      onClick={() => {
        navigate(ROUTES.TEMPLATES_CREATE);
      }}
    >
      Create a Workflow
    </Button>
  );
}

const Title = styled.div`
  font-size: 28px;
  font-weight: 800;
  line-height: 1.4;
  color: ${colors.B40};
  tex-align: center;
`;

const SecondaryTitle = styled.div`
  font-size: 16px;
  line-height: 1.25;
  text-align: center;
`;

const SetupWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
`;
