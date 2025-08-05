import { Line, LineChart, XAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './primitives/card';
import { ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from './primitives/chart';

const chartData = [
  { date: 'Jul 14', delivered: 120, opened: 85, clicked: 35, engaged: 28 },
  { date: 'Jul 15', delivered: 118, opened: 82, clicked: 32, engaged: 25 },
  { date: 'Jul 16', delivered: 125, opened: 90, clicked: 40, engaged: 32 },
  { date: 'Jul 17', delivered: 115, opened: 78, clicked: 28, engaged: 22 },
  { date: 'Jul 18', delivered: 130, opened: 95, clicked: 45, engaged: 38 },
  { date: 'Jul 19', delivered: 122, opened: 87, clicked: 38, engaged: 30 },
  { date: 'Jul 20', delivered: 128, opened: 92, clicked: 42, engaged: 35 },
  { date: 'Jul 21', delivered: 135, opened: 98, clicked: 48, engaged: 40 },
  { date: 'Jul 22', delivered: 140, opened: 105, clicked: 52, engaged: 45 },
  { date: 'Jul 23', delivered: 138, opened: 102, clicked: 50, engaged: 42 },
  { date: 'Jul 24', delivered: 142, opened: 108, clicked: 55, engaged: 48 },
  { date: 'Jul 25', delivered: 145, opened: 112, clicked: 58, engaged: 50 },
  { date: 'Jul 26', delivered: 148, opened: 115, clicked: 60, engaged: 52 },
  { date: 'Jul 27', delivered: 150, opened: 118, clicked: 62, engaged: 55 },
  { date: 'Jul 28', delivered: 152, opened: 120, clicked: 65, engaged: 58 },
];

const chartConfig = {
  delivered: {
    label: 'Delivered',
    color: '#a5b4fc',
  },
  opened: {
    label: 'Opened',
    color: '#60a5fa',
  },
  clicked: {
    label: 'Clicked',
    color: '#34d399',
  },
  engaged: {
    label: 'Engaged',
    color: '#a78bfa',
  },
} satisfies ChartConfig;

export function InteractionTrendChart() {
  return (
    <Card>
      <CardHeader className="bg-transparent p-3 pb-0">
        <CardTitle className="text-label-sm text-text-sub">Interaction trend</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <LineChart accessibilityLayer data={chartData}>
            <XAxis
              dataKey="date"
              axisLine={{ stroke: '#e5e7eb', strokeDasharray: '3 3', strokeWidth: 1 }}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#99a0ae', textAnchor: 'middle' }}
              tickFormatter={(value) => {
                if (value === 'Jul 15') return 'Jul 15';
                if (value === 'Jul 28') return 'Jul 28';

                return '';
              }}
              domain={['dataMin', 'dataMax']}
            />

            <ChartTooltip cursor={false} content={<NovuTooltip showTotal={false} />} />
            <Line dataKey="delivered" stroke="#a5b4fc" strokeWidth={2} dot={false} type="monotone" />
            <Line dataKey="opened" stroke="#60a5fa" strokeWidth={2} dot={false} type="monotone" />
            <Line dataKey="clicked" stroke="#34d399" strokeWidth={2} dot={false} type="monotone" />
            <Line dataKey="engaged" stroke="#a78bfa" strokeWidth={2} dot={false} type="monotone" />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
