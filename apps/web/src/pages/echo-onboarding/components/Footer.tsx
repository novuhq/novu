import { hstack, vstack } from '@novu/novui/patterns';
import { text } from '@novu/novui/recipes';
import { styled } from '@novu/novui/jsx';
import { Button, IconOutlineMenuBook, When } from '@novu/design-system';
import { ROUTES } from '@novu/shared-web';
import { useNavigate } from 'react-router-dom';
import { css } from '@novu/novui/css';

const Text = styled('a', text);

export const Footer = ({
  canSkipSetup = true,
  learnMoreLink = '',
  buttonText = 'Continue',
  onClick,
}: {
  canSkipSetup?: boolean;
  learnMoreLink?: string;
  buttonText?: string;
  onClick?: () => void;
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
            width: '680px',
            justify: 'space-between',
          })}
        >
          <div className={hstack({ gap: '100', color: 'typography.text.secondary' })}>
            <IconOutlineMenuBook />
            <Text href={learnMoreLink}>Learn more in our docs</Text>
          </div>
          <div className={hstack({ gap: '100' })}>
            <When truthy={canSkipSetup}>
              <Button onClick={() => navigate(ROUTES.WORKFLOWS)} variant="outline">
                Skip setup
              </Button>
            </When>
            <Button onClick={onClick}>{buttonText}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
