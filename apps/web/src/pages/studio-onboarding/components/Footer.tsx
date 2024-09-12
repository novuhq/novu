import { text } from '@novu/novui/recipes';
import { HStack, styled, VStack } from '@novu/novui/jsx';
import { Tooltip } from '@novu/design-system';
import { IconOutlineMenuBook } from '@novu/novui/icons';
import { useLocation } from 'react-router-dom';
import { css } from '@novu/novui/css';
import { Button } from '@novu/novui';
import { When } from '../../../components/utils/When';
import { DocsButton } from '../../../components/docs/DocsButton';
import { useTelemetry } from '../../../hooks/useNovuAPI';
import { PATHS } from '../../../components/docs/docs.const';
import { DocsPaths, useDocsPath } from '../../../components/docs/useDocsPath';
import { ROUTES } from '../../../constants/routes';

const Text = styled('a', text);

const paths: DocsPaths = {
  [ROUTES.STUDIO_ONBOARDING]: PATHS.QUICK_START_NEXTJS,
  [ROUTES.STUDIO_ONBOARDING_PREVIEW]: PATHS.CONCEPT_CONTROLS,
};

export const Footer = ({
  showLearnMore = true,
  buttonText = 'Continue',
  onClick,
  loading = false,
  tooltip = '',
  disabled = false,
}: {
  showLearnMore?: boolean;
  buttonText?: string;
  onClick?: () => void;
  loading?: boolean;
  tooltip?: string;
  disabled?: boolean;
}) => {
  const track = useTelemetry();
  const { pathname } = useLocation();
  const path = useDocsPath(paths);

  return (
    <div
      className={css({
        paddingTop: '50',
        paddingBottom: '100',
        backgroundColor: 'surface.panel',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 'docked',
      })}
    >
      <VStack alignContent="center" className={css({ height: '250' })}>
        <HStack
          justify="space-between"
          className={css({
            width: 'onboarding',
          })}
        >
          <div>
            <When truthy={showLearnMore}>
              <DocsButton
                path={path}
                TriggerButton={({ onClick: onDocsClick }) => (
                  <HStack gap="50" className={css({ color: 'typography.text.secondary' })}>
                    <IconOutlineMenuBook />
                    <Text
                      onClick={(e) => {
                        e.preventDefault();
                        track('Documentation linked clicked - [Onboarding - Signup]', {
                          step: pathname,
                        });
                        onDocsClick();
                      }}
                      href=""
                    >
                      Learn more in our docs
                    </Text>
                  </HStack>
                )}
              />
            </When>
          </div>
          <HStack gap="100">
            <Tooltip label={tooltip} disabled={!tooltip}>
              <Button loading={loading} onClick={onClick} disabled={disabled}>
                {buttonText}
              </Button>
            </Tooltip>
          </HStack>
        </HStack>
      </VStack>
    </div>
  );
};
