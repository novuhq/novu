import { Bar, BarChart, XAxis } from 'recharts';
import { StepTypeEnum } from '@/utils/enums';
import { STEP_TYPE_TO_ICON } from './icons/utils';
import { Card, CardContent, CardHeader, CardTitle } from './primitives/card';
import { ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from './primitives/chart';

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

function DeliveryTooltip(props: { payload?: any[]; [key: string]: any }) {
  const channels = [
    {
      key: 'email',
      label: 'Email',
      value: props.payload?.[0]?.payload?.email || 0,
      color: '#8b5cf6',
      icon: STEP_TYPE_TO_ICON[StepTypeEnum.EMAIL],
    },
    {
      key: 'push',
      label: 'Push',
      value: props.payload?.[0]?.payload?.push || 0,
      color: '#06b6d4',
      icon: STEP_TYPE_TO_ICON[StepTypeEnum.PUSH],
    },
    {
      key: 'sms',
      label: 'SMS',
      value: props.payload?.[0]?.payload?.sms || 0,
      color: '#facc15',
      icon: STEP_TYPE_TO_ICON[StepTypeEnum.SMS],
    },
    {
      key: 'inApp',
      label: 'In-app (Inbox)',
      value: props.payload?.[0]?.payload?.inApp || 0,
      color: '#f97316',
      icon: STEP_TYPE_TO_ICON[StepTypeEnum.IN_APP],
    },
  ];

  return <NovuTooltip {...props} rows={channels} showTotal={true} />;
}

export function DeliveryTrendsChart() {
  return (
    <Card className="shadow-box-xs border-none">
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
            <ChartTooltip cursor={false} content={<DeliveryTooltip />} />
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
