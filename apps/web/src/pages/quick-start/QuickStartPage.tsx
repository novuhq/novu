import { Timeline, Center, createStyles, Grid, Card, Group, useMantineColorScheme } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { useTemplates } from '../../api/hooks/use-templates';
import PageMeta from '../../components/layout/components/PageMeta';
import PageContainer from '../../components/layout/components/PageContainer';
import { Button, colors, Text, Title, shadows } from '../../design-system';
import { CheckCircle } from '../../design-system/icons';
import React, { useState } from 'react';
import { Prism } from '@mantine/prism';
import { useIntegrations } from '../../api/hooks';

function QuickStart() {
  const { templates } = useTemplates();
  const { integrations } = useIntegrations();
  const { colorScheme } = useMantineColorScheme();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [templateActive, setTemplateActive] = useState(false);
  const [providerActive, setProviderActive] = useState(true);
  const [embedActive, setEmbedActive] = useState(true);
  const [triggerActive, setTriggerActive] = useState(true);

  const onDismissOnboarding = () => {
    // eslint-disable-next-line no-console
    console.log('da');
    navigate('/templates');
  };

  const { classes } = useStyles();
  const triggerCodeSnippet = `import { Novu } from '@novu/node'; 

const novu = new Novu('<API_KEY>');

novu.trigger('<REPLACE_WITH_TRIGGER_ID>', {
  to: { 
    subscriberId: '<REPLACE_WITH_USER_ID>', 
  },
  payload: {
     '<REPLACE_WITH_VARIABLE_NAME>': "<REPLACE_WITH_DATA>",
  }
});
`;

  return (
    <PageContainer>
      <PageMeta title="Getting Started" />
      <div style={{ padding: '40px' }}>
        <Center>
          <Title>Welcome to Novu!</Title>
        </Center>
        <Center>
          <Text my={10} color={colors.B60}>
            Let's get you started
          </Text>
        </Center>
      </div>

      <div style={{ maxWidth: '800px', margin: 'auto' }}>
        <Timeline lineWidth={1} color={colors.B30} bulletSize={55} classNames={classes}>
          <Timeline.Item
            bullet={
              <Text weight="bold" size="lg" color={providerActive ? colors.white : colors.B60}>
                1
              </Text>
            }
            active={providerActive}
          >
            <OnboardingStepHeader
              title="Connect your delivery providers"
              description="You can choose to connect any of our available delivery providers and manage them from a single place"
            />
            {providerActive ? (
              <Button mt={20} onClick={() => navigate('/integrations')}>
                Configure Now
              </Button>
            ) : (
              <Center mt={20} inline>
                <CheckCircle color={colors.success} />
                <Text ml={7} color={colors.success}>
                  Configured
                </Text>
              </Center>
            )}
          </Timeline.Item>
          <Timeline.Item
            bullet={
              <Text weight="bold" size="lg" color={templateActive ? colors.white : colors.B60}>
                2
              </Text>
            }
            active={templateActive}
          >
            <OnboardingStepHeader
              title="Create your first notification template"
              description="To start sending notifications you need to create your a template with some channels"
            />
            {templateActive ? (
              <Button mt={20} onClick={() => navigate('/templates/create')}>
                Create Now
              </Button>
            ) : (
              <Center mt={20} inline>
                <CheckCircle color={colors.success} />
                <Text ml={7} color={colors.success}>
                  Created
                </Text>
              </Center>
            )}
          </Timeline.Item>
          <Timeline.Item
            bullet={
              <Text weight="bold" size="lg" color={triggerActive ? colors.white : colors.B60}>
                3
              </Text>
            }
            active={triggerActive}
          >
            <OnboardingStepHeader
              title="Send a trigger from your API"
              description="Use one of our server side SDK’s to send triggers from your API"
            />
            <Grid mt={20}>
              <Grid.Col span={3}>
                <Card
                  withBorder
                  style={{ minHeight: '115px', backgroundColor: 'transparent', borderColor: colors.B30 }}
                >
                  <RibbonWrapper>
                    <ComingSoonRibbon>COMING SOON</ComingSoonRibbon>
                  </RibbonWrapper>
                  <StyledCardContent>
                    <Logo src="/static/images/triggers/spring.svg" alt="spring" />
                    <Text color={colors.B60}>Spring Boot</Text>
                  </StyledCardContent>
                </Card>
              </Grid.Col>
              <Grid.Col span={3}>
                <Card
                  withBorder
                  style={{ minHeight: '115px', backgroundColor: 'transparent', borderColor: colors.B30 }}
                >
                  <RibbonWrapper>
                    <ComingSoonRibbon>COMING SOON</ComingSoonRibbon>
                  </RibbonWrapper>
                  <StyledCardContent>
                    <Logo src="/static/images/triggers/kotlin.svg" alt="kotlin" />
                    <Text color={colors.B60}>Kotlin</Text>
                  </StyledCardContent>
                </Card>
              </Grid.Col>
              <Grid.Col span={3}>
                <Card
                  withBorder
                  style={{ minHeight: '115px', backgroundColor: 'transparent', borderColor: colors.B30 }}
                >
                  <RibbonWrapper>
                    <ComingSoonRibbon>COMING SOON</ComingSoonRibbon>
                  </RibbonWrapper>
                  <StyledCardContent>
                    <Logo src="/static/images/triggers/native.svg" alt="native" />
                    <Text color={colors.B60}>Native</Text>
                  </StyledCardContent>
                </Card>
              </Grid.Col>
              <Grid.Col span={3}>
                <Card
                  onClick={() => setShow((prev) => !prev)}
                  withBorder
                  style={{ minHeight: '115px', backgroundColor: 'transparent', borderColor: colors.B30 }}
                >
                  <StyledCardContent>
                    <Logo src="/static/images/triggers/node.svg" alt="node" />
                    <Text color={colors.B60}>Node.js</Text>
                  </StyledCardContent>
                </Card>
              </Grid.Col>
            </Grid>
            {show && (
              <div>
                <Text mt={20}>Here is an example code usage</Text>
                <Prism mt={10} styles={prismStyles} data-test-id="trigger-code-snippet" language="javascript">
                  {triggerCodeSnippet}
                </Prism>
              </div>
            )}
          </Timeline.Item>

          <Timeline.Item
            bullet={
              <Text weight="bold" size="lg" color={embedActive ? colors.white : colors.B60}>
                4
              </Text>
            }
            active={embedActive}
          >
            <OnboardingStepHeader
              title="Embed a notification center in your app (Optional)"
              description="Use our embeddable widget to add a notification center in minutes"
            />
            <Button mt={20} onClick={() => navigate('/settings')}>
              Embed Now
            </Button>
          </Timeline.Item>
        </Timeline>
      </div>
      <Center>
        <Text my={40} color={colors.B60}>
          <div onClick={onDismissOnboarding}>Don't show onboarding guide</div>
        </Text>
      </Center>
    </PageContainer>
  );
}

export default QuickStart;

const useStyles = createStyles((theme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';

  return {
    itemBullet: {
      ref: getRef('itemBullet'),
      boxShadow: dark ? shadows.dark : shadows.medium,
      backgroundColor: `${dark ? colors.B20 : colors.BGLight} !important`,
      borderRadius: '40px',
      border: 'none',
    },
    itemBody: {
      padding: '20px',
      backgroundColor: dark ? colors.B20 : colors.BGLight,
      boxShadow: dark ? shadows.dark : shadows.medium,
      borderRadius: '7px',
    },
    itemActive: {
      color: 'red',
      [`& .${getRef('itemBullet')}`]: {
        backgroundColor: `${dark ? colors.B17 : colors.B98} !important`,
      },
    },
  };
});

const StyledText = styled(Text)`
  display: inline-block;

  margin: 0 6px;
`;

const Logo = styled.img`
  max-width: 140px;
  max-height: 50px;
`;
const RibbonWrapper = styled.div`
  width: 115px;
  height: 115px;
  position: absolute;
  right: 5px;
  top: 5px;
  transform: rotate(45deg);
`;

const ComingSoonRibbon = styled.div`
  background: ${colors.horizontal};
  color: ${colors.white};
  font-size: 9px;
  width: 100%;
  text-align: center;
  line-height: 20px;
  font-weight: bold;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;

  svg {
    color: ${colors.B40};
  }
`;

const OnboardingStepHeader = ({ title, description }: { title: string; description: string }) => {
  return (
    <div>
      <Title size={2}>{title}</Title>
      <Text color={colors.B60}>{description}</Text>
    </div>
  );
};

const StyledCardContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <Group
      align="center"
      spacing={7}
      direction="column"
      styles={{
        root: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
        },
      }}
    >
      {children}
    </Group>
  );
};

const prismStyles = (theme) => ({
  code: {
    fontWeight: '400',
    color: `${colors.B60} !important`,
    backgroundColor: 'transparent !important',
    border: ` 1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5]}`,
    borderRadius: '7px',
  },
});
