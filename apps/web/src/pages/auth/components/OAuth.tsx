import { Divider } from '@mantine/core';
import styled from '@emotion/styled';
import { Button as MantineButton } from '@mantine/core';

import { colors, GitHub, Google, Text } from '@novu/design-system';

import { When } from '../../../components/utils/When';
import { IS_DOCKER_HOSTED } from '../../../config';
import { buildGithubLink, buildGoogleLink, buildVercelGithubLink } from './gitHubUtils';
import { useVercelParams } from '../../../hooks';

export function OAuth({ invitationToken }: { invitationToken?: string | undefined }) {
  const { isFromVercel, code, next, configurationId } = useVercelParams();

  const githubLink = isFromVercel
    ? buildVercelGithubLink({ code, next, configurationId })
    : buildGithubLink({ invitationToken });
  const googleLink = buildGoogleLink({ invitationToken });

  return (
    <When truthy={!IS_DOCKER_HOSTED}>
      <>
        <Container>
          <OAuthButton
            component="a"
            href={githubLink}
            my={30}
            variant="white"
            fullWidth
            radius="md"
            leftIcon={<GitHub />}
            sx={{ color: colors.B40, fontSize: '16px', fontWeight: 700, height: '50px', marginRight: 10 }}
            data-test-id="github-button"
          >
            Sign In with GitHub
          </OAuthButton>
          {/*<OAuthButton
            component="a"
            href={googleLink}
            my={30}
            variant="white"
            fullWidth
            radius="md"
            leftIcon={<Google />}
            data-test-id="google-button"
            sx={{ color: colors.B40, fontSize: '16px', fontWeight: 700, height: '50px', marginLeft: 10 }}
          >
            Sign In with Google
          </OAuthButton>*/}
        </Container>
        <Divider label={<Text color={colors.B40}>Or</Text>} color={colors.B30} labelPosition="center" my="md" />
      </>
    </When>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: space-between;
`;

const OAuthButton = styled(MantineButton)<{
  component: 'a';
  my: number;
  href: string;
  variant: 'white';
  fullWidth: boolean;
  radius: 'md';
  leftIcon: any;
  sx: any;
}>`
  :hover {
    color: ${colors.B40};
  }
`;
