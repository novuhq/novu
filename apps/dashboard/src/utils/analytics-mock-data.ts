import {
  type ActiveSubscribersDataPoint,
  type ActiveSubscribersTrendDataPoint,
  type AvgMessagesPerSubscriberDataPoint,
  type ChartDataPoint,
  type GetChartsResponse,
  type InteractionTrendDataPoint,
  type MessagesDeliveredDataPoint,
  type ProviderVolumeDataPoint,
  ReportTypeEnum,
  type TotalInteractionsDataPoint,
  type WorkflowRunsCountDataPoint,
  type WorkflowRunsMetricDataPoint,
  type WorkflowRunsTrendDataPoint,
  type WorkflowVolumeDataPoint,
} from '../api/activity';

function generateTimestamps(days: number): string[] {
  const timestamps: string[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    timestamps.push(date.toISOString());
  }

  return timestamps;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMockAnalyticsData(): GetChartsResponse {
  const timestamps = generateTimestamps(30);

  // Mock delivery trend data
  const deliveryTrendData: ChartDataPoint[] = timestamps.map((timestamp) => ({
    timestamp,
    inApp: randomBetween(20, 150),
    email: randomBetween(50, 300),
    sms: randomBetween(10, 80),
    chat: randomBetween(5, 40),
    push: randomBetween(30, 200),
  }));

  // Mock interaction trend data
  const interactionTrendData: InteractionTrendDataPoint[] = timestamps.map((timestamp) => ({
    timestamp,
    messageSeen: randomBetween(100, 500),
    messageRead: randomBetween(50, 300),
    messageSnoozed: randomBetween(5, 30),
    messageArchived: randomBetween(10, 50),
  }));

  // Mock workflow volume data
  const workflowVolumeData: WorkflowVolumeDataPoint[] = [
    { workflowName: 'Welcome Email', count: randomBetween(500, 1200) },
    { workflowName: 'Password Reset', count: randomBetween(200, 600) },
    { workflowName: 'Order Confirmation', count: randomBetween(300, 800) },
    { workflowName: 'Newsletter', count: randomBetween(1000, 2500) },
    { workflowName: 'Account Verification', count: randomBetween(150, 400) },
  ];

  // Mock provider volume data
  const providerVolumeData: ProviderVolumeDataPoint[] = [
    { providerId: 'sendgrid', count: randomBetween(800, 1500) },
    { providerId: 'twilio', count: randomBetween(200, 500) },
    { providerId: 'slack', count: randomBetween(100, 300) },
    { providerId: 'fcm', count: randomBetween(300, 700) },
    { providerId: 'mailgun', count: randomBetween(150, 400) },
  ];

  // Mock workflow runs trend data
  const workflowRunsTrendData: WorkflowRunsTrendDataPoint[] = timestamps.map((timestamp) => ({
    timestamp,
    processing: randomBetween(5, 25),
    completed: randomBetween(80, 200),
    error: randomBetween(2, 15),
  }));

  // Mock active subscribers trend data
  const activeSubscribersTrendData: ActiveSubscribersTrendDataPoint[] = timestamps.map((timestamp) => ({
    timestamp,
    count: randomBetween(1000, 3000),
  }));

  // Mock metric data points (current vs previous period)
  const messagesDeliveredData: MessagesDeliveredDataPoint = {
    currentPeriod: randomBetween(15000, 25000),
    previousPeriod: randomBetween(12000, 20000),
  };

  const activeSubscribersData: ActiveSubscribersDataPoint = {
    currentPeriod: randomBetween(2500, 4500),
    previousPeriod: randomBetween(2000, 4000),
  };

  const avgMessagesPerSubscriberData: AvgMessagesPerSubscriberDataPoint = {
    currentPeriod: randomBetween(8, 15),
    previousPeriod: randomBetween(6, 12),
  };

  const totalInteractionsData: TotalInteractionsDataPoint = {
    currentPeriod: randomBetween(5000, 12000),
    previousPeriod: randomBetween(4000, 10000),
  };

  const workflowRunsMetricData: WorkflowRunsMetricDataPoint = {
    currentPeriod: randomBetween(500, 1500),
    previousPeriod: randomBetween(400, 1200),
  };

  const workflowRunsCountData: WorkflowRunsCountDataPoint = {
    count: randomBetween(800, 2000),
  };

  return {
    data: {
      [ReportTypeEnum.DELIVERY_TREND]: deliveryTrendData,
      [ReportTypeEnum.INTERACTION_TREND]: interactionTrendData,
      [ReportTypeEnum.WORKFLOW_BY_VOLUME]: workflowVolumeData,
      [ReportTypeEnum.PROVIDER_BY_VOLUME]: providerVolumeData,
      [ReportTypeEnum.WORKFLOW_RUNS_TREND]: workflowRunsTrendData,
      [ReportTypeEnum.ACTIVE_SUBSCRIBERS_TREND]: activeSubscribersTrendData,
      [ReportTypeEnum.MESSAGES_DELIVERED]: messagesDeliveredData,
      [ReportTypeEnum.ACTIVE_SUBSCRIBERS]: activeSubscribersData,
      [ReportTypeEnum.AVG_MESSAGES_PER_SUBSCRIBER]: avgMessagesPerSubscriberData,
      [ReportTypeEnum.TOTAL_INTERACTIONS]: totalInteractionsData,
      [ReportTypeEnum.WORKFLOW_RUNS_METRIC]: workflowRunsMetricData,
      [ReportTypeEnum.WORKFLOW_RUNS_COUNT]: workflowRunsCountData,
    },
  };
}
