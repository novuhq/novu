import { RiRouteFill } from 'react-icons/ri';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './primitives/card';
import { ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from './primitives/chart';

const chartData = [
  { workflow: 'Password reset workflow', volume: 17762, fill: '#8b5cf6' },
  { workflow: 'Email newsletter', volume: 7762, fill: '#06b6d4' },
  { workflow: 'OTP confirmation', volume: 4762, fill: '#facc15' },
  { workflow: 'Doctor Appointment workflow', volume: 2762, fill: '#f97316' },
  { workflow: 'Onboarding workflow', volume: 762, fill: '#8b5cf6' },
];

const chartConfig = {
  volume: {
    label: 'Volume',
  },
} satisfies ChartConfig;

function CustomTick({ x, y, payload }: { x: number; y: number; payload: { value: string } }) {
  const maxLength = 20;
  const text = payload.value.length > maxLength ? `${payload.value.slice(0, maxLength)}...` : payload.value;

  return (
    <g transform={`translate(${x},${y})`}>
      <RiRouteFill x={-16} y={-6} width={12} height={12} fill="#525866" />
      <text x={-2} y={0} dy={4} textAnchor="start" fill="#525866" fontSize={12}>
        {text}
      </text>
    </g>
  );
}

function WorkflowTooltip(props: { payload?: any[]; label?: string; [key: string]: any }) {
  const rows = props.payload?.map((item) => ({
    key: 'volume',
    label: item.payload?.workflow || 'Workflow',
    value: item.value || 0,
    color: item.payload?.fill || item.color || '#000',
    icon: RiRouteFill,
  }));

  return <NovuTooltip {...props} rows={rows} showTotal={false} title="" />;
}

export function WorkflowsByVolume() {
  return (
    <Card className="w-full shadow-box-xs border-none">
      <CardHeader className="bg-transparent p-3 pb-0">
        <CardTitle className="text-label-sm text-text-sub">Top workflows by volume</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <BarChart accessibilityLayer data={chartData} layout="vertical" barGap={1}>
            <XAxis type="number" dataKey="volume" hide />
            <YAxis
              dataKey="workflow"
              type="category"
              tickLine={false}
              tickMargin={168}
              axisLine={false}
              width={190}
              tick={CustomTick}
            />
            <ChartTooltip cursor={false} content={<WorkflowTooltip />} />
            <Bar dataKey="volume" radius={6} barSize={16} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
