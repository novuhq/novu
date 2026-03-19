import type { TooltipProps } from 'recharts';
import { NovuTooltip } from '../../primitives/chart';

const ACTIVE_SUBSCRIBERS_COLOR = '#818cf8';

export function ActiveSubscribersTooltip(props: TooltipProps<number, string>) {
  const { active, payload, label } = props;

  if (!active || !payload?.length) {
    return null;
  }

  const value = payload[0]?.value ?? 0;
  const rows = [
    {
      key: 'active-subscribers',
      label: 'Active Subscribers',
      value: Number(value),
      color: ACTIVE_SUBSCRIBERS_COLOR,
    },
  ];

  return <NovuTooltip active={active} label={label} rows={rows} showTotal={false} />;
}
