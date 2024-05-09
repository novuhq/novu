import { css } from '../../styled-system/css';
import { FC } from 'react';

/**
 * An example component using Panda.
 * TODO remove this in a future iteration.
 */
export const Test: FC = () => {
  return (
    <p
      className={css({
        bg: 'legacy.warning',
        textAlign: 'center',
        textStyle: 'title.page',
      })}
    >
      Testing everything now
    </p>
  );
};
