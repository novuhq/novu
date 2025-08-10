import { useMemo } from 'react';
import { Line, LineChart, XAxis } from 'recharts';
import { type InteractionTrendDataPoint } from '../api/activity';
import { Card, CardContent, CardHeader, CardTitle } from './primitives/card';
import { ChartConfig, ChartContainer, ChartTooltip, NovuTooltip } from './primitives/chart';
import { Skeleton } from './primitives/skeleton';

const chartConfig = {
  messageSent: {
    label: 'Sent',
    color: '#a5b4fc',
  },
  messageSeen: {
    label: 'Seen',
    color: '#60a5fa',
  },
  messageRead: {
    label: 'Read',
    color: '#34d399',
  },
  messageSnoozed: {
    label: 'Snoozed',
    color: '#a78bfa',
  },
  messageArchived: {
    label: 'Archived',
    color: '#f97316',
  },
} satisfies ChartConfig;

function InteractionTrendChartSkeleton() {
  return (
    <Card className="shadow-box-xs border-none">
      <CardHeader className="bg-transparent p-3 pb-0">
        <CardTitle className="text-label-sm text-text-sub">
          <Skeleton className="h-4 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="h-[160px] w-full flex items-end justify-between gap-2 px-2">
          {Array.from({ length: 15 }).map((_, i) => {
            const height = Math.random() * 100 + 20;

            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <Skeleton className="w-full rounded-full" style={{ height: `${height}px` }} />
                {(i === 0 || i === 14) && <Skeleton className="h-2 w-6 mt-2" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

type InteractionTrendChartProps = {
  data?: InteractionTrendDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
};

export function InteractionTrendChart({ data, isLoading, error }: InteractionTrendChartProps) {
  const chartData = useMemo(() => {
    return data?.map((dataPoint) => ({
      date: new Date(dataPoint.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      messageSent: dataPoint.messageSent,
      messageSeen: dataPoint.messageSeen,
      messageRead: dataPoint.messageRead,
      messageSnoozed: dataPoint.messageSnoozed,
      messageArchived: dataPoint.messageArchived,
      timestamp: dataPoint.timestamp,
    }));
  }, [data]);

  if (isLoading) {
    return <InteractionTrendChartSkeleton />;
  }

  if (error) {
    return (
      <Card className="shadow-box-xs border-none">
        <CardHeader className="bg-transparent p-3 pb-0">
          <CardTitle className="text-label-sm text-text-sub">Interaction trend</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="h-[160px] w-full flex items-center justify-center">
            <div className="text-sm text-text-soft">Failed to load chart data</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const firstDate = chartData?.[0]?.date || '';
  const lastDate = chartData?.[chartData.length - 1]?.date || '';
  return (
    <Card className="shadow-box-xs border-none">
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
                if (value === firstDate) return firstDate;
                if (value === lastDate) return lastDate;

                return '';
              }}
              domain={['dataMin', 'dataMax']}
            />

            <ChartTooltip cursor={false} content={<NovuTooltip showTotal={false} />} />
            <Line dataKey="messageSent" name="Sent" stroke="#a5b4fc" strokeWidth={2} dot={false} type="monotone" />
            <Line dataKey="messageSeen" name="Seen" stroke="#60a5fa" strokeWidth={2} dot={false} type="monotone" />
            <Line dataKey="messageRead" name="Read" stroke="#34d399" strokeWidth={2} dot={false} type="monotone" />
            <Line
              dataKey="messageSnoozed"
              name="Snoozed"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={false}
              type="monotone"
            />
            <Line
              dataKey="messageArchived"
              name="Archived"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
