export type ExampleInputs = {
  /** Sent in order in one fresh chat, so later turns edit the workflow the first turn created. */
  turns: string[];
};

export type StepCheck = {
  type: string;
  /** Which step of that type, in workflow order. Defaults to the first. */
  nth?: number;
  /** Case-insensitive substrings that must appear in the step's control values. */
  includes?: string[];
  /** Passes when the control values match any one of these (top-level keys compared exactly). */
  controls?: Record<string, unknown>[];
  /** true: has a skip condition; false: has none; strings: has one that mentions all of them. */
  condition?: boolean | string[];
};

export type Expectation = {
  /** Case-insensitive exact name. */
  name?: string;
  /** Exact step types, in order. */
  stepTypes?: string[];
  critical?: boolean;
  /** Tags the workflow must have (others are allowed). */
  tags?: string[];
  /** Keys the payload schema must define. */
  payloadKeys?: string[];
  /** Keys the payload schema must mark required. */
  payloadRequired?: string[];
  steps?: StepCheck[];
};

export type EvalExample = {
  /** Stable key, stored in example metadata so re-syncing updates instead of duplicating. */
  key: string;
  inputs: ExampleInputs;
  outputs: Expectation;
};

const hours = (n: number) => [
  { amount: n, unit: 'hours' },
  { amount: n * 60, unit: 'minutes' },
];

// Workflow names are unique across examples so concurrent runs never edit each other's workflow.
export const EXAMPLES: EvalExample[] = [
  {
    key: 'create-from-scratch',
    inputs: {
      turns: [
        'Create a workflow called "Order shipped" that sends an in-app notification, waits 2 hours, then sends an email if the user hasn\'t read the in-app message. The payload has orderId, trackingUrl and carrierName.',
      ],
    },
    outputs: {
      name: 'Order shipped',
      stepTypes: ['in_app', 'delay', 'email'],
      payloadKeys: ['orderId', 'trackingUrl', 'carrierName'],
      steps: [
        { type: 'delay', controls: hours(2) },
        { type: 'email', condition: ['read'] },
      ],
    },
  },
  {
    key: 'edit-multi-turn',
    inputs: {
      turns: [
        'Create a workflow called "Order dispatched" with an in-app step, a 2 hour delay and an email step. The payload has orderId, trackingUrl and carrierName.',
        'Add an SMS step at the end saying "Your order {{payload.orderId}} has shipped via {{payload.carrierName}}".',
        'Insert a push notification between the in-app step and the delay.',
        'Move the SMS step so it runs before the email.',
        'Remove the push step.',
        'Rename the workflow to "Order dispatched v2" and add the tags "orders" and "transactional".',
      ],
    },
    outputs: {
      name: 'Order dispatched v2',
      stepTypes: ['in_app', 'delay', 'sms', 'email'],
      tags: ['orders', 'transactional'],
      steps: [{ type: 'sms', includes: ['payload.orderId', 'payload.carrierName'] }],
    },
  },
  {
    key: 'edit-step-content',
    inputs: {
      turns: [
        'Create a workflow "Password reset" with a single email step.',
        'Make the email subject "Reset your password", and the body a short message with a button linking to {{payload.resetUrl}}. Add resetUrl to the payload.',
        'Change the button text to "Choose a new password" and add a line saying the link expires in 15 minutes.',
      ],
    },
    outputs: {
      name: 'Password reset',
      stepTypes: ['email'],
      payloadKeys: ['resetUrl'],
      steps: [
        {
          type: 'email',
          includes: ['Reset your password', 'payload.resetUrl', 'Choose a new password', '15 minutes'],
        },
      ],
    },
  },
  {
    key: 'conditions',
    inputs: {
      turns: [
        'Create a workflow "Billing alert" with in-app, email and chat steps. The payload has amount (number) and plan (string).',
        'Only send the email if the amount is greater than 100.',
        'Only send the chat message if the plan is "enterprise" AND the amount is greater than 1000.',
        'Remove the condition from the email step.',
      ],
    },
    outputs: {
      name: 'Billing alert',
      stepTypes: ['in_app', 'email', 'chat'],
      payloadKeys: ['amount', 'plan'],
      steps: [
        { type: 'email', condition: false },
        { type: 'chat', condition: ['payload.plan', 'enterprise', 'payload.amount', '1000'] },
      ],
    },
  },
  {
    key: 'digest',
    inputs: {
      turns: [
        'Create a workflow "Comment digest" that collects comments for 30 minutes per subscriber, then sends one email listing them all. The payload has commentText and authorName.',
        'Change the digest window to 1 hour.',
      ],
    },
    outputs: {
      name: 'Comment digest',
      stepTypes: ['digest', 'email'],
      payloadKeys: ['commentText', 'authorName'],
      steps: [{ type: 'digest', controls: hours(1) }],
    },
  },
  {
    // Every request after the first is invalid; the workflow should come out of it intact.
    key: 'error-paths',
    inputs: {
      turns: [
        'Create a workflow "Support ticket" with an in-app step, an email step and an SMS step. The payload has ticketId.',
        'Remove the step called "fax" from this workflow.',
        'Move the email step to position 10.',
        'Set the email subject to an empty string.',
        'Add a condition on the SMS step using payload.doesNotExist > 5.',
      ],
    },
    outputs: {
      name: 'Support ticket',
      stepTypes: ['in_app', 'email', 'sms'],
      payloadKeys: ['ticketId'],
    },
  },
  {
    key: 'multi-change-single-turn',
    inputs: {
      turns: [
        'Create a workflow "Order shipped v2" with an in-app step, a 2 hour delay and an email step. The payload has trackingUrl.',
        'In the "Order shipped v2" workflow: add a chat step at the end, change the in-app message to "Your package is on its way 🚚", require orderId in the payload, and only send the email if trackingUrl exists.',
      ],
    },
    outputs: {
      name: 'Order shipped v2',
      stepTypes: ['in_app', 'delay', 'email', 'chat'],
      payloadRequired: ['orderId'],
      steps: [
        { type: 'in_app', includes: ['Your package is on its way'] },
        { type: 'email', condition: ['trackingUrl'] },
      ],
    },
  },
  {
    // Open-ended: only checks the workflow survives; compare the replies side by side.
    key: 'vague-request',
    inputs: {
      turns: ['Create a workflow "Welcome" with a single in-app step.', 'Make this workflow better for customer engagement.'],
    },
    outputs: { name: 'Welcome' },
  },
  {
    key: 'onboarding-sequence',
    inputs: {
      turns: [
        "Build me a full onboarding sequence: welcome email right away, in-app tip after 1 day, a reminder email after 3 days if they haven't completed setup, and a push on day 7.",
      ],
    },
    outputs: {
      stepTypes: ['email', 'delay', 'in_app', 'delay', 'email', 'delay', 'push'],
      steps: [{ type: 'email', nth: 1, condition: ['setup'] }],
    },
  },
  {
    key: 'edit-make-critical',
    inputs: {
      turns: [
        'Create a workflow called "Account locked" with an email step telling the user their account was locked.',
        'Make this workflow critical so it is delivered regardless of subscriber preferences.',
      ],
    },
    outputs: { name: 'Account locked', stepTypes: ['email'], critical: true },
  },
  {
    key: 'create-with-tags',
    inputs: {
      turns: ['Create a workflow called "Security alert" with a push step and an SMS step, tagged "security".'],
    },
    outputs: { name: 'Security alert', stepTypes: ['push', 'sms'], tags: ['security'] },
  },
];
