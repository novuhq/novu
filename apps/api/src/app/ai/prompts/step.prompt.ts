import { z } from 'zod';
import { stepInputSchema } from '../schemas/steps-control.schema';
import { DraftWorkflowState } from '../tools';
import { formatVariableSchemaForPrompt } from '../tools/variable-schema.utils';
import {
  GENERAL_CONTENT_GUIDELINES,
  NO_ADDITIONAL_TEXT_OUTPUT_REQUIREMENTS,
  NO_MARKDOWN_CODE_BLOCK_OUTPUT_REQUIREMENTS,
  VALID_JSON_SCHEMA_OUTPUT_REQUIREMENTS,
} from './general.prompt';
import { EXAMPLE_BLOCK_EDITOR_JSON } from './maily-blocks';

// Step Critical Output Requirements
export const STEP_CRITICAL_OUTPUT_REQUIREMENTS = `## CRITICAL OUTPUT FORMAT:
${VALID_JSON_SCHEMA_OUTPUT_REQUIREMENTS}
${NO_ADDITIONAL_TEXT_OUTPUT_REQUIREMENTS}
${NO_MARKDOWN_CODE_BLOCK_OUTPUT_REQUIREMENTS}`;

// Step Content Guidelines
export const STEP_CONTENT_GUIDELINES = `${GENERAL_CONTENT_GUIDELINES}
- Use appropriate formatting and styling only when it is necessary to improve the readability of the content
- Align content with the workflow's purpose and the user's original request
- Keep the content consistent with the other steps in the workflow
- Use appropriate personalization with Liquid templating ({{ subscriber.firstName }}, {{ payload.* }})
- Never put hardcoded URLs, names, product names, etc. in the content. Always use the existing variables or create new variables if needed, for example: {{ payload.actionUrl }}, {{ subscriber.firstName }}, {{ payload.productName }}.`;

export const STEP_CONTENT_PROMPTS = {
  email: `Add an email step to the workflow.
Best for: detailed content, formal communications, receipts, newsletters.

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

## Email Content Requirements
- Subject lines should be compelling and under 60 characters
- Keep paragraphs short and scannable
- Include clear call-to-action buttons when necessary

## HTML Format Requirements
- Body must be valid HTML with inline styles for email client compatibility
- Use semantic HTML: <h1>, <h2>, <p>, <a>, <table> for layout
- Add inline styles for colors, spacing, fonts (e.g., style="color: #333; margin: 16px 0;")
- Make sure that the content has enough whitespace between the elements and around the content to be readable.
- Use tables for layout to ensure compatibility across email clients. Avoid flexbox or grid; apply inline styles to table cells only when needed for spacing or typography.
- Include variables using Liquid syntax: {{ subscriber.firstName }}, {{ payload.variableName }}

### Example only for the HTML format:
<a href="{{ payload.actionUrl }}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600;">Click Here</a>

## Block Editor Format Guideline
1. Use heading nodes for titles (level 1 for main, level 2 for sections).
2. Use text node for body text.
3. Use spacer nodes between sections (height: 16 or 24).
4. Use button nodes for CTAs with good contrast colors.

### Block Editor nodes must follow these requirements:
1. Maily TipTap JSON format with proper node structure is required.
2. Never wrap variable names in any node attributes with curly braces "{{" and "}}".
  - Always use the variable name directly, without any templating syntax.
  - Correct examples:
    - "subscriber.firstName"
    - "payload.variableName"
    - "current.payload.variableName"
  - Incorrect examples:
    - "{{subscriber.firstName}}"
    - "{{ payload.variableName }}"
    - "{{current.payload.variableName}}"
3. Text variables should be defined using "variable" nodes with "id" attribute like "id": "subscriber.firstName" or "id": "payload.variableName". The "aliasFor" attribute is optional and should be used only when the variable is accessed inside the repeat node.
4. The "repeat" node must always have the "each" attribute, for example "each": "payload.items".
  To access the items in the array, you must use the "variable" node with:
  - "id" attribute (required)
  - "aliasFor" attribute (required)
  Rules for the "variable" node only when used in the "repeat" node:
  - The "id" attribute must use the special prefix "current.", for example: "id": "current.variableName"
  - The "aliasFor" attribute must consist of: <each value> + "." + <variable name>, for example: "aliasFor": "payload.items.variableName"
  - Never use any other prefix than "current." in the "variable" node "id" attribute when accessing array items.
  - Example: { "type": "variable", "attrs": { "id": "current.variableName", "aliasFor": "payload.items.variableName" } }
5. "button" or "image" nodes can contain the variable but always within the "url" attribute and with "isUrlVariable" or "isTextVariable" boolean attributes defined. 
  - Example: { "type": "button", "attrs": { "text": "payload.actionUrl", "isTextVariable": true } }
  - Example: { "type": "button", "attrs": { "url": "payload.actionUrl", "isUrlVariable": true } }
6. "inlineImage" node can contain the variable but always within "src" attribute with "isSrcVariable" boolean attribute defined or within the "externalLink" attribute with "isExternalLinkVariable" boolean attribute defined.
  - Example: { "type": "inlineImage", "attrs": { "src": "payload.imageUrl", "isSrcVariable": true } }
  - Example: { "type": "inlineImage", "attrs": { "externalLink": "payload.imageUrl, "isExternalLinkVariable": true } }

### Digest Step Special Variables
1. "steps.<digest-step-id>.events"
  - This is a special variable available **only** for steps that come after a digest step.
  - The variable name is dynamic and depends on the digest step ID, for example:
    - "steps.digest-step.events"
    - "steps.digest-step-2.events"
  - It must be used with the "repeat" node only to iterate over the digested events payload.
  - To access the digested events "payload" data, use the "variable" node with attributes:
    - "id" attribute (required):
      - Must start with the "current.payload" prefix.
      - Format: "current.payload.<variableName>"
        Example: "id": "current.payload.variableName"
      - Never use any prefix other than "current.payload" in the "variable" node "id" attribute when accessing digested events.
    - "aliasFor" attribute (required):
      - Format: "aliasFor": "steps.<digest-step-id>.events.payload.<variableName>"
      - Example: "aliasFor": "steps.digest-step.events.payload.variableName"
    - Example: { "type": "variable", "attrs": { "id": "current.payload.variableName", "aliasFor": "steps.digest-step.events.payload.variableName" } }

2. "steps.<digest-step-id>.eventCount"
  - This is a special variable available **only** for steps that come after a digest step.
  - The variable name is dynamic and depends on the digest step ID, for example:
    - "steps.digest-step.eventCount"
    - "steps.digest-step-2.eventCount"
  - It is used to access the **number of digested events**.

### Example only for the Block Editor JSON structure, always use it as a reference:
\`\`\`json
${EXAMPLE_BLOCK_EDITOR_JSON}
\`\`\`
`,

  in_app: `Add an in-app notification step to the workflow.
Best for: real-time notifications within the app, high engagement, activity feeds.

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

  sms: `Add an SMS step to the workflow.
Best for: urgent, time-sensitive alerts, verification codes.

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

  push: `Add a push notification step to the workflow.
Best for: mobile app engagement, re-engagement, time-sensitive updates.

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

  chat: `Add a chat step to the workflow for Slack, Discord, or Teams integrations.
Best for: team notifications, developer alerts, workspace updates.

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

  delay: `Add a delay step to pause workflow execution.
Place BEFORE the channel steps it should delay.

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

  digest: `Add a digest step to batch multiple notifications into one.
Place BEFORE the channel steps it should affect.

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

  throttle: `Add a throttle step to limit notification frequency.
Prevents over-notifying users by limiting how often they receive notifications.

## Your task
Generate the throttle step configuration.

${STEP_CRITICAL_OUTPUT_REQUIREMENTS}

## Schema Requirements
- type: "fixed" | "dynamic" - Throttle type (fixed for time-window based throttling)
- amount: number (required for fixed) - Number of time units for throttle window
- unit: string (required for fixed) - One of: "seconds", "minutes", "hours", "days", "weeks", "months"
- threshold: number (required) - Maximum number of notifications allowed in the window
- throttleKey: string (required for fixed) - Key to group throttle rules
- dynamicKey: string (required for dynamic) - Key for dynamic grouping

## Usage Guidelines
- Use throttle to prevent notification fatigue
- Common patterns:
  - Max 3 notifications per hour per user
  - Max 1 notification per day for marketing
  - Throttle by specific key (e.g., "payload.alertType") for grouped limits`,
};

export function buildStepSystemPrompt(basePrompt: string, draftState: DraftWorkflowState): string {
  const variableSchema = draftState.getFullVariableSchema();
  const variableSchemaPrompt = formatVariableSchemaForPrompt(variableSchema);

  if (variableSchemaPrompt) {
    return `${basePrompt}
## Available Variables Context
IMPORTANT: When using variables, prefer reusing the existing variables listed below to maintain consistency across the workflow.
- Only introduce new payload variables if they are truly needed for this step's specific content.

### Variable Semantics
IMPORTANT: Always use the variables in the appropriate context when the content is created.
- workflow.*: Current workflow meta data like workflowId, name, description, tags, severity, etc.
- subscriber.*: Subscriber's / recipient's personal information like first name, last name, email, phone, etc.
- payload.*: Payload's data like action URL, product name, order number, etc.
- steps.*: Steps's data like events, event count, in the digest step, etc.
- context.*: Context is a user-defined data object that stores metadata (like tenant, region, or app details) to organize and personalize notifications.

${variableSchemaPrompt}`;
  }

  return basePrompt;
}

export function buildStepUserPrompt(input: z.infer<typeof stepInputSchema>): string {
  return `Step: ${input.name}\nIntent: ${input.intent}\nStep ID: ${input.stepId}`;
}
