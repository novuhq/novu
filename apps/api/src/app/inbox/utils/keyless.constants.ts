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

/**
 * Application identifier prefix used for keyless / demo environments. Both the
 * inbox session use case (which provisions the env) and the inbox events
 * endpoint (which is restricted to keyless callers) rely on this prefix to
 * tell keyless environments apart from real customer ones.
 */
export const KEYLESS_ENVIRONMENT_PREFIX = 'pk_keyless_';
