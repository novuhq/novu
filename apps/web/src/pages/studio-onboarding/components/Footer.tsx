import { text } from '@novu/novui/recipes';
import { HStack, styled, VStack } from '@novu/novui/jsx';
import { Tooltip } from '@novu/design-system';
import { IconOutlineMenuBook } from '@novu/novui/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { css } from '@novu/novui/css';
import { When } from '../../../components/utils/When';
import { DocsButton } from '../../../components/docs/DocsButton';
import { Button } from '@novu/novui';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { ROUTES } from '../../../constants/routes';

const Text = styled('a', text);

export const Footer = ({
  canSkipSetup = true,
  showLearnMore = true,
  buttonText = 'Continue',
  onClick,
  loading = false,
  tooltip = '',
  disabled = false,
}: {
  canSkipSetup?: boolean;
  showLearnMore?: boolean;
  buttonText?: string;
  onClick?: () => void;
  loading?: boolean;
  tooltip?: string;
  disabled?: boolean;
}) => {
  const segment = useSegment();
  const navigate = useNavigate();
  const { pathname } = useLocation();

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
                TriggerButton={({ onClick: onDocsClick }) => (
                  <HStack gap="50" className={css({ color: 'typography.text.secondary' })}>
                    <IconOutlineMenuBook />
                    <Text
                      onClick={(e) => {
                        e.preventDefault();
                        segment.track('Documentation linked clicked - [Onboarding - Signup]', {
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
            <When truthy={canSkipSetup}>
              <Button
                disabled={loading}
                onClick={() => {
                  segment.track('Skip setup button clicked - [Onboarding - Signup]', {
                    step: pathname,
                  });
                  navigate(ROUTES.WORKFLOWS);
                }}
                variant="transparent"
              >
                Skip setup
              </Button>
            </When>
            <Tooltip label={tooltip} disabled={!tooltip}>
              <Button variant="filled" loading={loading} onClick={onClick} disabled={disabled}>
                {buttonText}
              </Button>
            </Tooltip>
          </HStack>
        </HStack>
      </VStack>
    </div>
  );
};
