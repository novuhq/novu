import {
  ActivityNotificationJobResponseDto,
  ActivityNotificationResponseDto,
  ChannelSettingsDto,
  CredentialsDto,
  EnvironmentResponseDto,
  EnvironmentVariableResponseDto,
  IntegrationResponseDto,
  MessageCTA as MessageCTAType,
  MessageResponseDto,
  StepFilterDto,
  SubscriberPayloadDto,
  SubscriberResponseDto,
  TopicResponseDto,
  TopicSubscriptionResponseDto,
  WorkflowResponse,
} from '@novu/api/models/components';

// subscriber
export type Subscriber = SubscriberResponseDto;
export type ChannelSettings = ChannelSettingsDto;

// topic
export type Topic = TopicResponseDto;
export type TopicSubscription = TopicSubscriptionResponseDto;

// message
export type Message = MessageResponseDto;
export type Actor = SubscriberPayloadDto | string;
export type MessageCTA = MessageCTAType;

// notification
export type Notification = ActivityNotificationResponseDto;
export type ActivityJob = ActivityNotificationJobResponseDto;

// integration
export type Integration = IntegrationResponseDto;
export type Credentials = CredentialsDto;
export type StepFilter = StepFilterDto;

// environment
export type Environment = EnvironmentResponseDto;

// environment variable
export type EnvironmentVariable = EnvironmentVariableResponseDto;

// workflow
export type Workflow = WorkflowResponse;
