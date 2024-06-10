import { css } from '@novu/novui/css';
export const Background = () => (
  <svg
    className={css({
      height: '100%',
      width: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
    })}
  >
    <pattern id="pattern-0" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
      <circle
        cx="1"
        cy="1"
        r="1"
        className={css({
          fill: 'surface.popover',
        })}
      ></circle>
    </pattern>
    <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-0)"></rect>
  </svg>
);
