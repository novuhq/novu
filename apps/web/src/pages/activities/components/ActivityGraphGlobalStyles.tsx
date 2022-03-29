import { css, Global } from '@emotion/react';
import { colors } from '../../../design-system';

export function ActivityGraphGlobalStyles({ isTriggerSent }: { isTriggerSent: boolean }) {
  return <Global styles={ChartStyles(isTriggerSent)} />;
}

function ChartStyles(isTriggerSent: boolean) {
  const filter = isTriggerSent ? 'none' : 'blur(4px)';
  const pointerEvents = isTriggerSent ? 'auto' : 'none';

  return css`
    #chart-bar-styles {
      height: 175px;
      filter: ${filter};
      pointer-events: ${pointerEvents};
    }

    #chartjs-tooltip {
      width: 190px;
      display: flex;
      justify-content: center;

      background: ${colors.B20};
      border-radius: 7px;
      padding: 12px 15px 14px 15px;
      pointer-events: none;
      position: absolute;

      &:after {
        display: inline-block;
        bottom: -9px;
        content: '';
        position: absolute;
        left: calc(50% - 5px);
        border-top: 10px solid ${colors.B20};
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
      }
    }

    .tooltip-title {
      display: flex;

      justify-content: center;
      height: 17px;
      margin-bottom: 4px;
      border-width: 22px;
      color: ${colors.B60};
    }

    .tooltip-body {
      position: static;
      display: flex;
      justify-content: center;

      height: 17px;
      border-width: 22px;

      color: #ff512f;
      background: -webkit-linear-gradient(90deg, #dd2476 0%, #ff512f 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  `;
}
