import { text } from '@novu/novui/recipes';
import { HStack, styled, VStack } from '@novu/novui/jsx';
import { Button, Tooltip } from '@novu/design-system';
import { IconOutlineMenuBook } from '@novu/novui/icons';
import { useNavigate } from 'react-router-dom';
import { css } from '@novu/novui/css';
import { When } from '../../../components/utils/When';
import { DocsButton } from '../../../components/docs/DocsButton';
import { ROUTES } from '../../../constants/routes';

const Text = styled('a', text);

export const Footer = ({
  canSkipSetup = true,
  showLearnMore = true,
  buttonText = 'Continue',
  onClick,
  loading = false,
  tooltip = '',
}: {
  canSkipSetup?: boolean;
  showLearnMore?: boolean;
  buttonText?: string;
  onClick?: () => void;
  loading?: boolean;
  tooltip?: string;
}) => {
  const navigate = useNavigate();

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
      })}
    >
      <VStack alignContent="center" className={css({ height: '250' })}>
        <HStack
          justify="space-between"
          className={css({
            width: '880px',
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
              <Button onClick={() => navigate(ROUTES.WORKFLOWS)} variant="outline">
                Skip setup
              </Button>
            </When>
            <Tooltip label={tooltip} disabled={!tooltip}>
              <Button loading={loading} onClick={onClick}>
                {buttonText}
              </Button>
            </Tooltip>
          </HStack>
        </HStack>
      </VStack>
    </div>
  );
};
