import { Injectable } from '@nestjs/common';
import { WorkflowSuggestionDto, WorkflowSuggestionType } from '../../dtos';

@Injectable()
export class GetSuggestionsUseCase {
  execute(): WorkflowSuggestionDto[] {
    return [
      {
        id: 'welcome-email',
        type: WorkflowSuggestionType.WELCOME,
        title: 'Welcome Email',
        description: 'Send a personalized welcome email to new users when they sign up',
        icon: 'mail',
        examplePrompt:
          'Create a welcome workflow that sends a personalized email to new users with their name and a getting started guide',
      },
      {
        id: 'password-reset',
        type: WorkflowSuggestionType.PASSWORD_RESET,
        title: 'Password Reset',
        description: 'Secure password reset flow with email verification',
        icon: 'lock',
        examplePrompt:
          'Create a password reset workflow that sends a secure reset link via email and confirms when the password is changed',
      },
      {
        id: 'order-confirmation',
        type: WorkflowSuggestionType.ORDER_CONFIRMATION,
        title: 'Order Confirmation',
        description: 'Multi-channel order confirmation with email and in-app notifications',
        icon: 'shopping-cart',
        examplePrompt:
          'Create an order confirmation workflow that sends an email receipt and an in-app notification with order details',
      },
      {
        id: 'marketing-campaign',
        type: WorkflowSuggestionType.MARKETING,
        title: 'Marketing Campaign',
        description: 'Promotional notifications with digest and delay capabilities',
        icon: 'megaphone',
        examplePrompt:
          'Create a marketing workflow with a delay before sending and the ability to digest multiple promotions',
      },
      {
        id: 'real-time-alert',
        type: WorkflowSuggestionType.REAL_TIME_ALERT,
        title: 'Real-time Alert',
        description: 'Urgent notifications via push and SMS for time-sensitive events',
        icon: 'bell',
        examplePrompt:
          'Create an urgent alert workflow that sends push notifications immediately and falls back to SMS if needed',
      },
      {
        id: 'activity-digest',
        type: WorkflowSuggestionType.DIGEST,
        title: 'Activity Digest',
        description: 'Aggregate multiple events into a single summary notification',
        icon: 'layers',
        examplePrompt:
          'Create a daily digest workflow that collects all user activities and sends a summary email at the end of the day',
      },
    ];
  }
}
