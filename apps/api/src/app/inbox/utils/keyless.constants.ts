/**
 * The trigger identifier of the demo workflow that is created for keyless
 * environments. Inbox subscriber JWTs are only allowed to trigger this workflow
 * via the `/inbox/events` endpoint. Keep in sync with the workflow created in
 * `Session.createWorkflowsUsecase`.
 */
export const KEYLESS_WORKFLOW_IDENTIFIER = 'hello-world';

/**
 * The hard-coded subscriber id used for the keyless / demo flow. See
 * `Session.buildPlatformSubscriber`.
 */
export const KEYLESS_SUBSCRIBER_ID = 'keyless-subscriber-id';
