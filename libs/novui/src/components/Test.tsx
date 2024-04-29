import { css } from 'styled-system/css';
import { FC } from 'react';

export const Test: FC = () => {
  return (
    <div
      className={css({
        bg: 'surface.page',
        w: '11/12',
        h: '[69px]',
        textAlign: 'center',
        textStyle: 'title.section',
      })}
    >
      Testing everything now
    </div>
  );
};
