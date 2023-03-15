import { Stack } from '@mantine/core';
import styled from '@emotion/styled';
import { useNavigate, useParams } from 'react-router-dom';

import PageContainer from '../../components/layout/components/PageContainer';
import { ArrowButton, colors, Title, Text, Button } from '../../design-system';
import { parseUrl } from '../../utils/routeUtils';
import { ROUTES } from '../../constants/routes.enum';

const Heading = styled(Title)`
  color: ${colors.B40};
  font-size: 40px;
`;

const SubHeading = styled(Text)`
  font-size: 20px;
`;

const DigestWorkflowHolder = styled.div`
  width: 400px;
  height: 400px;
  background: ${colors.vertical};
`;

const LinkStyled = styled.a`
  font-size: 16px;
  color: #2b85df;
  text-decoration: underline;
`;

export const TemplatesDigestPlaygroundPage = () => {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  return (
    <PageContainer title="Digest Workflow Playground" style={{ padding: '32px' }}>
      <ArrowButton label="Go Back" onClick={() => navigate(-1)} />
      <Stack mt={20} spacing="xs" align="center">
        <Heading>Digest Workflow Playground</Heading>
        <SubHeading>The digest engine aggregates multiple events into a precise notification</SubHeading>
      </Stack>
      <Stack mt={40} align="center">
        <DigestWorkflowHolder />
      </Stack>
      <Stack mt={40} mb={40} align="center">
        <Button onClick={() => navigate(`${parseUrl(ROUTES.TEMPLATES_EDIT_TEMPLATEID, { templateId })}?tour=digest`)}>
          Set Up Digest Workflow
        </Button>
        <LinkStyled target="_blank" rel="noopener noreferrer" href="https://docs.novu.co/platform/digest">
          Learn more in docs
        </LinkStyled>
      </Stack>
    </PageContainer>
  );
};
