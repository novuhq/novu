export const ANALYTICS_TOOLTIPS = {
  MESSAGES_DELIVERED:
    'Shows the total number of messages generated across all channels (Email, SMS, Push, In-App) during the selected time period.',

  ACTIVE_SUBSCRIBERS:
    'Displays the count of unique subscribers who have received at least one message during the selected time period.',

  INTERACTIONS:
    'Shows total user interactions with messages:\n\n• Message seen\n• Message read\n• Message snoozed\n• Message archived\n\nTracks engagement across in-app notifications with more channels coming soon.',

  AVG_MESSAGES_PER_SUBSCRIBER:
    'Calculates the average number of messages sent per subscriber during the selected time period.',

  DELIVERY_TREND:
    'Visualizes daily delivery volume breakdown by channel:\n\n• Email\n• SMS\n• Push\n• In-App\n\nShows trends over the selected time period.',

  INTERACTION_TREND:
    'Shows daily interaction patterns over time:\n\n• Message sent\n• Message seen\n• Message read\n• Message snoozed\n\nVisualizes user engagement trends with your notifications.',

  TOP_WORKFLOWS_BY_VOLUME:
    'Displays the workflow runs with the highest volume, showing which workflows are most actively used.',

  WORKFLOW_RUNS_TREND: 'Tracks workflow runs patterns over time.',

  ACTIVE_SUBSCRIBERS_TREND:
    'Visualizes the growth or decline of your active subscriber base over the selected time period.',

  PROVIDERS_BY_VOLUME:
    'Shows message distribution across different delivery providers (SendGrid, Twilio, Firebase, etc.) by volume.',
} as const;
