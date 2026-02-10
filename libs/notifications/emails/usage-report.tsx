import { UsageReportEmail } from '../src/workflows/usage-report/email';

const defaultProps = {
  dateRange: 'Jan 1 - Jan 7, 2024',
  messagesSent: 1250,
  messagesSentChange: 12.5,
  messagesSentUp: true,
  usersReached: 850,
  usersReachedChange: 8.3,
  usersReachedUp: true,
  workflowRuns: 3200,
  successRate: 98.5,
  userInteractions: 450,
  interactionRate: 35.2,
  topProviders: [
    { name: 'Novu Inbox', count: 800, icon: 'https://dashboard.novu.co/images/providers/light/square/novu.svg' },
    { name: 'Resend', count: 450, icon: 'https://dashboard.novu.co/images/providers/light/square/resend.svg' },
    { name: 'MS Teams', count: 300, icon: 'https://dashboard.novu.co/images/providers/light/square/msteams.svg' },
    {
      name: 'WhatsApp Business',
      count: 150,
      icon: 'https://dashboard.novu.co/images/providers/light/square/whatsapp-business.svg',
    },
  ],
  topWorkflows: [
    { name: 'Welcome Email', count: 500 },
    { name: 'Password Reset', count: 300 },
    { name: 'Order Confirmation', count: 200 },
  ],
  channels: [
    { name: 'Email', value: 1250, color: '#dd2590', dashArray: '' },
    { name: 'In-App', value: 850, color: '#10b981', dashArray: '' },
    { name: 'SMS', value: 420, color: '#f59e0b', dashArray: '' },
    { name: 'Push', value: 180, color: '#3b82f6', dashArray: '' },
  ],
  dashboardUrl: 'https://dashboard.novu.co',
  previewText: 'Your monthly Novu usage report',
};

export default function Email() {
  return <UsageReportEmail {...defaultProps} />;
}
