import { hstack, vstack } from '@novu/novui/patterns';
import { text } from '@novu/novui/recipes';
import { styled } from '@novu/novui/jsx';
import { Button, Tooltip } from '@novu/design-system';
import { IconOutlineMenuBook } from '@novu/novui/icons';
import { ROUTES } from '@novu/shared-web';
import { useNavigate } from 'react-router-dom';
import { css } from '@novu/novui/css';
import { When } from '../../../components/utils/When';
import { DocsButton } from '../../../components/docs/DocsButton';

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
      <div className={vstack({ alignContent: 'center', height: '250' })}>
        <div
          className={hstack({
            width: '880px',
            justify: 'space-between',
          })}
        >
          <div className={hstack({ gap: '100', color: 'typography.text.secondary' })}>
            <When truthy={showLearnMore}>
              <DocsButton
                TriggerButton={({ onClick: onDocsClick }) => (
                  <>
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
                  </>
                )}
              />
            </When>
          </div>
          <div className={hstack({ gap: '100' })}>
            <When truthy={canSkipSetup}>
              <Button onClick={() => navigate(ROUTES.WORKFLOWS)} variant="outline">
                Skip setup
              </Button>
            </When>
            <Tooltip label={tooltip} disabled={tooltip.length === 0}>
              <Button loading={loading} onClick={onClick}>
                {buttonText}
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};
