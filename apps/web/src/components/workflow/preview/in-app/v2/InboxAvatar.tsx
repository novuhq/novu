import { useState } from 'react';
import { css } from '@novu/novui/css';
import { IconPerson } from '@novu/novui/icons';
import { INBOX_TOKENS } from './InboxPreviewContent';

export const InboxAvatar = (props: { src?: string }) => {
  const [isError, setIsError] = useState(false);

  const handleError = () => {
    setIsError(true);
  };

  if (props.src && !isError) {
    return (
      <img
        src={props.src}
        className={css({
          borderRadius: 'm',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          width: '2rem',
          height: '2rem',
        })}
        onError={handleError}
        alt="avatar"
      />
    );
  }

  return (
    <div
      className={css({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 'm',
        bgColor: INBOX_TOKENS['semantic/color/neutral/90'],
        width: '2rem',
        height: '2rem',
      })}
    >
      <IconPerson />
    </div>
  );
};
