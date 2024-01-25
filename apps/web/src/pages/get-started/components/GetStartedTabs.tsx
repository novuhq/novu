import React from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { Center, Container, Loader, Tabs } from '@mantine/core';

import { colors, Digest, HalfClock, MultiChannel, RingingBell, Translation } from '@novu/design-system';

import { useAuthContext } from '../../../components/providers/AuthProvider';
import { OnboardingParams } from '../types';
import { ROUTES } from '../../../constants/routes.enum';
import { OnboardingUseCasesTabsEnum } from '../../../constants/onboarding-tabs';
import { When } from '../../../components/utils/When';
import useStyles from './GetStartedTabs.style';

export function GetStartedTabs() {
  const { currentOrganization } = useAuthContext();
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';
  const { classes } = useStyles();
  const navigate = useNavigate();
  const { usecase } = useParams<OnboardingParams>();

  const iconStyle = { height: 20, width: 20, marginBottom: '12px' };

  if (!currentOrganization) {
    return (
      <Center>
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  return (
    <Container fluid mt={15} ml={5}>
      <Tabs
        orientation="horizontal"
        keepMounted={true}
        onTabChange={(tabValue) => {
          navigate(`${ROUTES.GET_STARTED}/${tabValue}`);
        }}
        variant="default"
        value={usecase ?? OnboardingUseCasesTabsEnum.IN_APP}
        classNames={classes}
        mb={15}
      >
        <Tabs.List>
          <Tabs.Tab value={OnboardingUseCasesTabsEnum.IN_APP} icon={<RingingBell style={iconStyle} />}>
            In-app
          </Tabs.Tab>
          <Tabs.Tab value={OnboardingUseCasesTabsEnum.MULTI_CHANNEL} icon={<MultiChannel style={iconStyle} />}>
            Multi-channel
          </Tabs.Tab>
          <Tabs.Tab value={OnboardingUseCasesTabsEnum.DIGEST} icon={<Digest style={iconStyle} />}>
            Digest
          </Tabs.Tab>
          <Tabs.Tab value={OnboardingUseCasesTabsEnum.DELAY} icon={<HalfClock style={iconStyle} />}>
            Delay
          </Tabs.Tab>
          <When truthy={!selfHosted}>
            <Tabs.Tab value={OnboardingUseCasesTabsEnum.TRANSLATION} icon={<Translation style={iconStyle} />}>
              Translate
            </Tabs.Tab>
          </When>
        </Tabs.List>
      </Tabs>
      <Outlet />
    </Container>
  );
}
