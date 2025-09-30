import {
  type ActiveSubscribersChartData,
  type DeliveryChartData,
  type InteractionChartData,
  type ProviderChartData,
  type WorkflowChartData,
  type WorkflowRunsChartData,
} from './chart-types';

export function generateDummyDeliveryData(): DeliveryChartData[] {
  const today = new Date();
  const dummyData = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    dummyData.push({
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      email: Math.floor(Math.random() * 150) + 50,
      push: Math.floor(Math.random() * 100) + 30,
      sms: Math.floor(Math.random() * 80) + 20,
      inApp: Math.floor(Math.random() * 120) + 40,
      chat: Math.floor(Math.random() * 60) + 10,
      timestamp: date.toISOString(),
    });
  }

  return dummyData;
}

export function generateDummyWorkflowData(): WorkflowChartData[] {
  const workflows = ['Welcome Email', 'Order Confirmation', 'Password Reset', 'Weekly Newsletter', 'Abandoned Cart'];

  return workflows.map((workflow, index) => ({
    workflowName: workflow,
    count: Math.floor(Math.random() * 1000) + 200,
    displayName: workflow,
    fill: ['#8b5cf6', '#06b6d4', '#facc15', '#f97316', '#ef4444'][index],
  }));
}

export function generateDummyProviderData(): ProviderChartData[] {
  const providers = ['sendgrid', 'twilio', 'mailgun', 'fcm', 'slack'];

  return providers.map((provider, index) => ({
    providerId: provider,
    count: Math.floor(Math.random() * 800) + 150,
    displayName: provider.charAt(0).toUpperCase() + provider.slice(1),
    fill: ['#8b5cf6', '#06b6d4', '#facc15', '#f97316', '#ef4444'][index],
  }));
}

export function generateDummyInteractionData(): InteractionChartData[] {
  const today = new Date();
  const dummyData = [];

  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const seen = Math.floor(Math.random() * 200) + 100;
    const read = Math.floor(seen * 0.6) + Math.floor(Math.random() * 15);
    const snoozed = Math.floor(read * 0.1) + Math.floor(Math.random() * 5);
    const archived = Math.floor(read * 0.05) + Math.floor(Math.random() * 3);

    dummyData.push({
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      messageSeen: seen,
      messageRead: read,
      messageSnoozed: snoozed,
      messageArchived: archived,
      timestamp: date.toISOString(),
    });
  }

  return dummyData;
}

export function generateDummyWorkflowRunsData(): WorkflowRunsChartData[] {
  const today = new Date();
  const dummyData = [];

  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const completed = Math.floor(Math.random() * 300) + 100;
    const processing = Math.floor(Math.random() * 50) + 10;
    const error = Math.floor(Math.random() * 30) + 5;

    dummyData.push({
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      completed,
      processing,
      error,
      timestamp: date.toISOString(),
    });
  }

  return dummyData;
}

export function generateDummyActiveSubscribersData(): ActiveSubscribersChartData[] {
  const today = new Date();
  const dummyData = [];

  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const count = Math.floor(Math.random() * 500) + 100;

    dummyData.push({
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      count,
      timestamp: date.toISOString(),
    });
  }

  return dummyData;
}
