import { FilterQuery } from 'mongoose';
import type { ConversationActivityDBModel } from './conversation-activity.entity';
import { ConversationActivitySenderTypeEnum, ConversationActivityTypeEnum } from './conversation-activity.entity';

export const ACTIVITY_VIEWS = [
  'llm_transcript',
  'agent_handoff',
  'client_events',
  'operator_timeline',
  'approval_activities',
] as const;

export type ActivityView = (typeof ACTIVITY_VIEWS)[number];

/**
 * Visibility classes, finer-grained than `type` alone (a MESSAGE row's class
 * depends on `senderType`, a SIGNAL row's on `signalData.type`). Kinds are not
 * stored — each one compiles to a Mongo predicate over existing fields, so old
 * rows need no migration.
 */
export const ACTIVITY_KINDS = [
  'message.subscriber',
  'message.agent',
  'message.platform_user',
  'message.system',
  'edit',
  'delete',
  'signal.tool_use',
  'signal.other',
  'tool_approval_request',
  'tool_approval_decision',
  'tool_result',
  'run_start',
  'run_finish',
  'run_error',
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_VIEW_MEMBERSHIP: Record<ActivityKind, readonly ActivityView[]> = {
  'message.subscriber': [
    'llm_transcript',
    'agent_handoff',
    'client_events',
    'operator_timeline',
    'approval_activities',
  ],
  'message.agent': ['llm_transcript', 'agent_handoff', 'client_events', 'operator_timeline'],
  'message.platform_user': ['agent_handoff', 'operator_timeline', 'approval_activities'],
  'message.system': ['agent_handoff'],
  edit: ['agent_handoff', 'client_events', 'operator_timeline'],
  delete: ['agent_handoff', 'client_events', 'operator_timeline'],
  'signal.tool_use': ['agent_handoff'],
  'signal.other': ['agent_handoff', 'operator_timeline'],
  tool_approval_request: ['agent_handoff', 'client_events', 'operator_timeline', 'approval_activities'],
  tool_approval_decision: ['agent_handoff', 'client_events', 'approval_activities'],
  tool_result: ['agent_handoff', 'client_events', 'approval_activities'],
  run_start: ['client_events'],
  run_finish: ['client_events'],
  run_error: ['client_events'],
};

export function getKindsForView(view: ActivityView): ActivityKind[] {
  return ACTIVITY_KINDS.filter((kind) => ACTIVITY_VIEW_MEMBERSHIP[kind].includes(view));
}

/** `client_events` is sequence-paged; other views sort by createdAt. */
export function viewUsesSequencePagination(view: ActivityView): boolean {
  return view === 'client_events';
}

function matchForKind(kind: ActivityKind): FilterQuery<ConversationActivityDBModel> {
  switch (kind) {
    case 'message.subscriber':
      return {
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
      };

    case 'message.agent':
      return {
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.AGENT,
      };

    case 'message.platform_user':
      return {
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.PLATFORM_USER,
      };

    case 'message.system':
      return {
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.SYSTEM,
      };

    case 'edit':
      return { type: ConversationActivityTypeEnum.EDIT };

    case 'delete':
      return { type: ConversationActivityTypeEnum.DELETE };

    case 'signal.tool_use':
      return {
        type: ConversationActivityTypeEnum.SIGNAL,
        'signalData.type': 'tool-use',
      };

    case 'signal.other':
      return {
        type: ConversationActivityTypeEnum.SIGNAL,
        $nor: [{ 'signalData.type': 'tool-use' }],
      };

    case 'tool_approval_request':
      return { type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST };

    case 'tool_approval_decision':
      return { type: ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION };

    case 'tool_result':
      return { type: ConversationActivityTypeEnum.TOOL_RESULT };

    case 'run_start':
      return { type: ConversationActivityTypeEnum.RUN_START };

    case 'run_finish':
      return { type: ConversationActivityTypeEnum.RUN_FINISH };

    case 'run_error':
      return { type: ConversationActivityTypeEnum.RUN_ERROR };
  }
}

/** Mongo match for rows visible in a named activity view. */
export function compileActivityViewMatch(view: ActivityView): FilterQuery<ConversationActivityDBModel> {
  return {
    $or: getKindsForView(view).map((kind) => matchForKind(kind)),
  };
}
