import { Divider, Button as MantineButton } from '@mantine/core';
import styled from '@emotion/styled';

import { colors, GitHub, Text } from '@novu/design-system';

import { PropsWithChildren } from 'react';
import { When } from '../../../components/utils/When';
import { IS_SELF_HOSTED } from '../../../config';
import { buildGithubLink, buildVercelGithubLink } from './gitHubUtils';
import { useVercelParams } from '../../../hooks';

export function OAuth({
  invitationToken,
  isLoginPage = false,
}: {
  invitationToken?: string | undefined;
  isLoginPage?: boolean;
}) {
  const { isFromVercel, code, next, configurationId } = useVercelParams();

  const githubLink = isFromVercel
    ? buildVercelGithubLink({ code, next, configurationId })
    : buildGithubLink({ invitationToken, isLoginPage });

  return (
    <When truthy={!IS_SELF_HOSTED}>
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

const OAuthButton = styled(MantineButton)<
  PropsWithChildren<{
    component: 'a';
    my: number;
    href: string;
    variant: 'white';
    fullWidth: boolean;
    radius: 'md';
    leftIcon: any;
    sx: any;
  }>
>`
  :hover {
    color: ${colors.B40};
  }
`;
