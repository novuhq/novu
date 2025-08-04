import { Bar, BarChart, XAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './primitives/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from './primitives/chart';

const chartData = [
  { date: 'Jul 14', email: 120, push: 80, sms: 40, inApp: 60 },
  { date: 'Jul 15', email: 100, push: 70, sms: 30, inApp: 50 },
  { date: 'Jul 16', email: 140, push: 90, sms: 45, inApp: 65 },
  { date: 'Jul 17', email: 110, push: 85, sms: 35, inApp: 55 },
  { date: 'Jul 18', email: 130, push: 95, sms: 50, inApp: 70 },
  { date: 'Jul 19', email: 90, push: 60, sms: 25, inApp: 45 },
  { date: 'Jul 20', email: 125, push: 85, sms: 40, inApp: 60 },
  { date: 'Jul 21', email: 105, push: 75, sms: 35, inApp: 55 },
  { date: 'Jul 22', email: 115, push: 80, sms: 45, inApp: 65 },
  { date: 'Jul 23', email: 135, push: 100, sms: 50, inApp: 75 },
  { date: 'Jul 24', email: 120, push: 90, sms: 40, inApp: 60 },
  { date: 'Jul 25', email: 110, push: 85, sms: 35, inApp: 55 },
];

const chartConfig = {
  email: {
    label: 'Email',
    color: '#8b5cf6',
  },
  push: {
    label: 'Push',
    color: '#06b6d4',
  },
  sms: {
    label: 'SMS',
    color: '#facc15',
  },
  inApp: {
    label: 'In-App',
    color: '#f97316',
  },
} satisfies ChartConfig;

export function DeliveryTrendsChart() {
  return (
    <Card>
      <CardHeader className="bg-transparent p-3 pb-0">
        <CardTitle className="text-label-sm text-text-sub">Delivery trend</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <BarChart accessibilityLayer data={chartData} barCategoryGap={5}>
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#99a0ae' }}
              tickFormatter={(value) => {
                if (value === 'Jul 14') return 'Jul 14';
                if (value === 'Jul 25') return 'Jul 25';

                return '';
              }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar
              dataKey="email"
              stackId="a"
              barSize={20}
              fill="#8b5cf6"
              radius={[3, 3, 6, 6]}
              stroke="#ffffff"
              strokeWidth={2}
            />
            <Bar dataKey="push" stackId="a" barSize={20} fill="#06b6d4" radius={3} stroke="#ffffff" strokeWidth={2} />
            <Bar dataKey="sms" stackId="a" barSize={20} fill="#facc15" radius={3} stroke="#ffffff" strokeWidth={2} />
            <Bar
              dataKey="inApp"
              stackId="a"
              barSize={20}
              fill="#f97316"
              radius={[6, 6, 3, 3]}
              stroke="#ffffff"
              strokeWidth={2}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
