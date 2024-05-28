import { hstack, vstack } from '@novu/novui/patterns';
import { text } from '@novu/novui/recipes';
import { styled } from '@novu/novui/jsx';
import { Button, IconOutlineMenuBook } from '@novu/design-system';
import { ReactNode } from 'react';

const Text = styled('a', text);

export const Footer = ({
  buttonDisabled = true,
  learnMoreLink = '',
  children = null,
}: {
  buttonDisabled?: boolean;
  learnMoreLink?: string;
  children?: ReactNode | null;
}) => {
  const onClick = () => {};

  return (
    <div className={vstack({ alignContent: 'center', height: '250', marginTop: '200' })}>
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
        {children ? (
          children
        ) : (
          <Button onClick={onClick} disabled={buttonDisabled}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
};
