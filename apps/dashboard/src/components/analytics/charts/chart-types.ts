export type DeliveryChartData = {
  date: string;
  email: number;
  push: number;
  sms: number;
  inApp: number;
  chat: number;
  timestamp: string;
};

export type WorkflowChartData = {
  workflowName: string;
  count: number;
  displayName: string;
  fill: string;
};

export type ProviderChartData = {
  providerId: string;
  count: number;
  displayName: string;
  fill: string;
};

export type InteractionChartData = {
  date: string;
  messageSeen: number;
  messageRead: number;
  messageSnoozed: number;
  messageArchived: number;
  timestamp: string;
};

export type WorkflowRunsChartData = {
  date: string;
  processing?: number;
  completed: number;
  error: number;
  timestamp: string;
};

export type ActiveSubscribersChartData = {
  date: string;
  count: number;
  timestamp: string;
};
