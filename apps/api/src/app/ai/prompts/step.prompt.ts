import { StepMetadata, WorkflowMetadata } from '../schemas/workflow-generation.schema';
import {
  ASSISTANT_DESCRIPTION,
  GENERAL_CONTENT_GUIDELINES,
  NO_ADDITIONAL_TEXT_OUTPUT_REQUIREMENTS,
  NO_MARKDOWN_CODE_BLOCK_OUTPUT_REQUIREMENTS,
  STEP_VALID_JSON_ROOT_OUTPUT_REQUIREMENTS,
  VALID_JSON_SCHEMA_OUTPUT_REQUIREMENTS,
} from './general.prompt';

// Step Critical Output Requirements
export const STEP_CRITICAL_OUTPUT_REQUIREMENTS = `## CRITICAL OUTPUT FORMAT:
${STEP_VALID_JSON_ROOT_OUTPUT_REQUIREMENTS}
${VALID_JSON_SCHEMA_OUTPUT_REQUIREMENTS}
${NO_ADDITIONAL_TEXT_OUTPUT_REQUIREMENTS}
${NO_MARKDOWN_CODE_BLOCK_OUTPUT_REQUIREMENTS}`;

// Step Content Guidelines
export const STEP_CONTENT_GUIDELINES = `${GENERAL_CONTENT_GUIDELINES}
- Use appropriate formatting and styling only when it is necessary to improve the readability of the content
- Align content with the workflow's purpose and the user's original request
- Keep the content consistent with the other steps in the workflow
- Use appropriate personalization with Liquid templating ({{ subscriber.firstName }}, {{ payload.* }})`;

export const STEP_CONTENT_PROMPTS = {
  email: `${ASSISTANT_DESCRIPTION}

## Your task
Generate the email step content. Choose either HTML or Block editor format.

${STEP_CRITICAL_OUTPUT_REQUIREMENTS}

${STEP_CONTENT_GUIDELINES}

## Schema Requirements (choose one editorType)

### Option 1: Block Editor Format (Recommended for simple email layouts)
- ALWAYS return required properties: subject, editorType, body
- subject: string - Email subject line.
- editorType: "block"
- body: object - Email body in Maily TipTap JSON format

### Option 2: HTML Format (Recommended for complex email layouts)
- ALWAYS return required properties: subject, editorType, body
- subject: string - Email subject line
- editorType: "html"
- body: string - Email body always in the HTML format. Use semantic HTML with inline styles. Structure with headings, paragraphs, and styled buttons.

## Email Content Guidelines
- Subject lines should be compelling and under 60 characters
- Keep paragraphs short and scannable
- Include clear call-to-action buttons
- Structure: greeting -> main content -> CTA button -> closing

## HTML Format Guidelines
- Body must be valid HTML with inline styles for email client compatibility
- Use semantic HTML: <h1>, <h2>, <p>, <a>, <table> for layout
- Add inline styles for colors, spacing, fonts (e.g., style="color: #333; margin: 16px 0;")
- Make sure that the content has enough whitespace between the elements and around the content to be readable.
- Use tables for layout to ensure compatibility across email clients. Avoid flexbox or grid; apply inline styles to table cells only when needed for spacing or typography.
- Include variables using Liquid syntax: {{ subscriber.firstName }}, {{ payload.variableName }}

Example button:
<a href="{{ payload.actionUrl }}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600;">Click Here</a>

## Block Editor Format Guidelines
- Body must be in Maily TipTap JSON format with proper node structure
- Use heading nodes for titles (level 1 for main, level 2 for sections)
- Use paragraph nodes for body text
- Use spacer nodes between sections (height: 16 or 24)
- Use button nodes for CTAs with good contrast colors
- Include variables using variable nodes with id like "subscriber.firstName" or "payload.variableName"

Example block structure:
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1, "textAlign": null }, "content": [{ "type": "text", "text": "Welcome!" }] },
    { "type": "spacer", "attrs": { "height": 16 } },
    { "type": "paragraph", "attrs": { "textAlign": null }, "content": [
      { "type": "text", "text": "Hi " },
      { "type": "variable", "attrs": { "id": "subscriber.firstName" } },
      { "type": "text", "text": ", thanks for joining!" }
    ]},
    { "type": "spacer", "attrs": { "height": 24 } },
    { "type": "button", "attrs": { "text": "Get Started", "url": "{{ payload.actionUrl }}", "variant": "filled", "buttonColor": "#007bff", "textColor": "#ffffff" } }
  ]
}`,

  in_app: `${ASSISTANT_DESCRIPTION}

## Your task
Generate the in-app notification content.

${STEP_CRITICAL_OUTPUT_REQUIREMENTS}

${STEP_CONTENT_GUIDELINES}

## Schema Requirements
- subject: string | null - Notification title (required if body is null)
- body: string | null - Notification message (required if subject is null)
- avatar: string | null - Avatar image URL (set to null if not needed)
- primaryAction: object | null - Main action button { label: string, redirect: { url: string, target: "_self" | "_blank" } | null }
- secondaryAction: object | null - Secondary action (set to null if not needed)
- redirect: object | null - Click redirect { url: string, target: "_self" | "_blank" } (set to null if not needed)

## Content Guidelines
- Can be slightly longer than push notifications
- Include action buttons when appropriate for user engagement
- Be contextual to the user's current state in the app
- Use clear, actionable language
- Keep the message focused on a single action or piece of information

## Personalization
Use Liquid templating: {{ subscriber.firstName }}, {{ payload.variableName }}`,

  sms: `${ASSISTANT_DESCRIPTION}

## Your task
Generate the SMS message content.

${STEP_CRITICAL_OUTPUT_REQUIREMENTS}

${STEP_CONTENT_GUIDELINES}

## Schema Requirements
- body: string (required) - SMS message text

## Content Guidelines
- Keep messages under 160 characters to avoid splitting into multiple messages
- Be direct and actionable - get to the point immediately
- Include only essential information
- Avoid special characters that might not render properly on all devices
- Don't include URLs unless absolutely necessary (use link shorteners if needed)
- Include a clear call-to-action

## Personalization
Use Liquid templating: {{ subscriber.firstName }}, {{ payload.variableName }}

## Example
"Hi {{ subscriber.firstName }}, your order #{{ payload.orderNumber }} has shipped! Track it here: {{ payload.trackingUrl }}"`,

  push: `${ASSISTANT_DESCRIPTION}

## Your task
Generate the push notification content.

${STEP_CRITICAL_OUTPUT_REQUIREMENTS}

${STEP_CONTENT_GUIDELINES}

## Schema Requirements
- subject: string (required) - Push notification title
- body: string (required) - Push notification body

## Content Guidelines
- Title should be under 50 characters (gets truncated on most devices)
- Body should be under 150 characters for full visibility
- Create urgency or communicate clear value proposition
- Be specific about what the user should do
- Use action-oriented language
- Front-load the most important information

## Personalization
Use Liquid templating: {{ subscriber.firstName }}, {{ payload.variableName }}

## Example
Title: "Your order is on its way!"
Body: "{{ subscriber.firstName }}, your package will arrive by {{ payload.deliveryDate }}. Tap to track."`,

  chat: `${ASSISTANT_DESCRIPTION}

## Your task
Generate the chat message content for platforms like Slack or Discord.

${STEP_CRITICAL_OUTPUT_REQUIREMENTS}

${STEP_CONTENT_GUIDELINES}

## Schema Requirements
- body: string (required) - Chat message content

## Content Guidelines
- Keep messages conversational and natural
- Be friendly but professional
- Include relevant context so the message makes sense standalone
- Make it easy to respond or take action
- Use appropriate formatting (markdown supported on most platforms)
- Consider that chat messages appear in a stream of other content

## Personalization
Use Liquid templating: {{ subscriber.firstName }}, {{ payload.variableName }}

## Example
"Hey {{ subscriber.firstName }}! 👋 Your {{ payload.projectName }} deployment completed successfully. View the details: {{ payload.deploymentUrl }}"`,

  delay: `${ASSISTANT_DESCRIPTION}

## Your task
Generate the delay step configuration.

${STEP_CRITICAL_OUTPUT_REQUIREMENTS}

## Schema Requirements
- type: "regular" (required) - Delay type
- amount: number (required) - Number of time units to wait
- unit: string (required) - One of: "seconds", "minutes", "hours", "days", "weeks", "months"

## Usage Guidelines
- Use delays to space out multi-channel notifications
- Common patterns:
  - Wait 1-2 hours before sending a reminder
  - Wait 24 hours before follow-up emails
  - Wait 5-10 minutes between push and email for urgent notifications`,

  digest: `${ASSISTANT_DESCRIPTION}

## Your task
Generate the digest step configuration.

${STEP_CRITICAL_OUTPUT_REQUIREMENTS}

## Schema Requirements
- type: "regular" | null - Digest type (set to null for default behavior)
- amount: number (required) - Number of time units for the digest window
- unit: string (required) - One of: "seconds", "minutes", "hours", "days", "weeks", "months"
- digestKey: string | null - Key to group events (set to null to group all events together)

## Usage Guidelines
- Use digest to batch multiple events into a single notification
- Common patterns:
  - Batch activity updates every hour
  - Daily digest of all notifications
  - Group by specific key (e.g., "payload.projectId") for per-project digests`,

  throttle: `${ASSISTANT_DESCRIPTION}

## Your task
Generate the throttle step configuration.

${STEP_CRITICAL_OUTPUT_REQUIREMENTS}

## Schema Requirements
- type: "fixed" | null - Throttle type (fixed for time-window based throttling)
- amount: number (required for fixed) - Number of time units for throttle window
- unit: string (required for fixed) - One of: "seconds", "minutes", "hours", "days", "weeks", "months"
- threshold: number (required) - Maximum number of notifications allowed in the window
- throttleKey: string | null - Key to group throttle rules
- dynamicKey: string | null - Key for dynamic grouping

## Usage Guidelines
- Use throttle to prevent notification fatigue
- Common patterns:
  - Max 3 notifications per hour per user
  - Max 1 notification per day for marketing
  - Throttle by specific key (e.g., "payload.alertType") for grouped limits`,
};

export const buildStepPrompt = ({
  step,
  workflowMetadata,
  userPrompt,
}: {
  step: StepMetadata;
  workflowMetadata: WorkflowMetadata;
  userPrompt: string;
}): string => {
  const { name: workflowName, description, steps, reasoning } = workflowMetadata;

  const stepsOverview = steps.map((s, i) => `${i + 1}. ${s.name} (${s.type})`).join('\n');

  return `Generate the content for step: **${step.name}** (type: ${step.type})

## Context of the user's workflow request
${userPrompt}

## The Generated Workflow Context
- **Workflow Name**: ${workflowName}
- **Description**: ${description || 'Not specified'}
- **Design Rationale**: ${reasoning.summary}

## The Generated Workflow Steps Overview
${stepsOverview}`;
};
