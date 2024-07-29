import React, { useEffect } from 'react';
import { useNavigate, Link as ReactLink } from 'react-router-dom';
import { motion } from 'framer-motion';

import { Button, Text, Title } from '@novu/novui';
import { useColorScheme, Tooltip } from '@novu/design-system';
import { css } from '@novu/novui/css';
import { IconClose } from '@novu/novui/icons';
import { HStack, VStack } from '@novu/novui/jsx';
import { IconArrowForward } from '@novu/novui/icons';

import { ROUTES } from '../../../constants/routes';
import { useTelemetry } from '../../../hooks/useNovuAPI';
import { PageContainer } from '../../../studio/layout';
import { COMPANY_LOGO_TEXT_PATH, COMPANY_LOGO_TEXT_PATH_DARK_TEXT } from '../../../constants/assets';

export function WelcomePage() {
  const track = useTelemetry();
  const { colorScheme } = useColorScheme();

  return (
    <div
      className={css({
        bg: 'surface.page',
      })}
    >
      <HStack
        className={css({
          padding: '16px 20px 0 20px',
          justifyContent: 'space-between',
          alignItems: 'center',
        })}
      >
        <img
          // TODO: these assets are not the same dimensions!
          src={colorScheme === 'dark' ? COMPANY_LOGO_TEXT_PATH : COMPANY_LOGO_TEXT_PATH_DARK_TEXT}
          className={css({
            h: '200',
            height: '24px',
          })}
        />
        <Tooltip position="left" label="Skip playground">
          <ReactLink
            to={ROUTES.WORKFLOWS}
            onClick={() => {
              track('Skip playground Clicked', { location: 'x-icon' });
            }}
          >
            <IconClose />
          </ReactLink>
        </Tooltip>
      </HStack>
      <Welcome />
    </div>
  );
}

export const Welcome = () => {
  const track = useTelemetry();
  const navigate = useNavigate();

  useEffect(() => {
    track('Welcome page visited - [Welcome]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageContainer className={css({ h: '100vh' })}>
      <VStack
        className={css({
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '80vh',
        })}
      >
        <div className={css({ width: '960px' })}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Title
              className={css({
                marginBottom: '8px',
              })}
              textAlign="center"
            >
              Welcome to Novu
            </Title>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div
              className={css({
                width: '540px',
                margin: '0 auto',
              })}
            >
              <Text
                className={css({
                  color: 'typography.text.secondary',
                  marginBottom: '24px',
                  textAlign: 'center',
                })}
              >
                Novu is a code-first notification platform, providing the flexibility of run time code, and the power of
                a full-fledged notification platform. <br /> <br /> In the next screen, you can see our interactive
                playground, where you can learn on the main building blocks of Novu.
              </Text>
            </div>
          </motion.div>
          <HStack
            className={css({
              marginBottom: '60px',
              flexWrap: 'wrap',
            })}
          >
            <HStack
              className={css({
                width: '100%',
                justifyContent: 'center',
              })}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Button
                  className={css({
                    background: '#292933 !important',
                    marginTop: '15px !important',
                  })}
                  onClick={() => {
                    track('Start playing Clicked [Welcome]');
                    navigate(ROUTES.DASHBOARD_PLAYGROUND);
                  }}
                >
                  Visit Playground
                </Button>
              </motion.div>
            </HStack>
          </HStack>
        </div>
      </VStack>
    </PageContainer>
  );
};
