import { z } from 'zod';
import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';
import { editStepInputSchema, stepInputSchema, updateStepConditionsInputSchema } from '../schemas/steps-control.schema';
import { formatVariableSchemaForPrompt } from '../utils/variable-schema.utils';
import { getVariableSchemaPrompt } from './general.prompt';
import { EXAMPLE_BLOCK_EDITOR_JSON } from './maily-blocks';

export const STEP_CONTENT_GUIDELINES = `## Content Guidelines
- Use Liquid variables for personalization: {{ subscriber.firstName }}, {{ payload.* }}
- Never hardcode URLs, names, or product names - use variables instead
- Keep content consistent with other workflow steps`;

export const STEP_CONTENT_PROMPTS = {
  email: `Email step for detailed content, formal communications, receipts.

## Your task
Generate the email step content. Choose either HTML or Block editor format.

${STEP_CONTENT_GUIDELINES}

## Schema Requirements (choose one editorType)

### Option 1: Block Editor Format (Recommended for simple email layouts)
- Always return required properties: subject, editorType, body
- subject: string - Email subject line.
- editorType: "block"
- body: object - Email body in Maily TipTap JSON format

### Option 2: HTML Format (Recommended for complex email layouts)
- Always return required properties: subject, editorType, body
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

  in_app: `In-app notification for real-time updates, activity feeds, high engagement.

${STEP_CONTENT_GUIDELINES}

Guidelines:
- Include action buttons for engagement
- Focus on single action or piece of information
- Can be longer than push notifications`,

  sms: `SMS step for urgent alerts, verification codes, time-sensitive messages.

${STEP_CONTENT_GUIDELINES}

Guidelines:
- Under 160 characters (avoid message splitting)
- Direct and actionable, essential info only
- Avoid special characters and unnecessary URLs

Example: "Hi {{ subscriber.firstName }}, your order #{{ payload.orderNumber }} has shipped! Track: {{ payload.trackingUrl }}"`,

  push: `Push notification for mobile engagement, re-engagement, time-sensitive updates.

${STEP_CONTENT_GUIDELINES}

Guidelines:
- Title: under 50 characters (truncated on devices)
- Body: under 150 characters
- Action-oriented, front-load important info

Example:
Title: "Your order is on its way!"
Body: "{{ subscriber.firstName }}, your package arrives {{ payload.deliveryDate }}. Tap to track."`,

  chat: `Chat step for Slack/Discord/Teams - team notifications, developer alerts.

${STEP_CONTENT_GUIDELINES}

Guidelines:
- Conversational tone, standalone context
- Markdown supported on most platforms

Example: "Hey {{ subscriber.firstName }}! Your {{ payload.projectName }} deployment completed. Details: {{ payload.deploymentUrl }}"`,

  delay: `Delay step to pause workflow execution. Place BEFORE channel steps.

Common patterns:
- 1-2 hours before reminders
- 24 hours before follow-up emails
- 5-10 minutes between push and email for urgent notifications`,

  digest: `Digest step to batch multiple notifications. Place BEFORE channel steps.

Digest Types:
- "regular" (default): with look back window - digest only if recent message sent; without - groups all events in time window
- "timed": with cron expression - collects until scheduled time (UTC)

Common patterns:
- Pass first event immediately, digest the rest
- Batch activity updates hourly
- Group by key (e.g., "payload.projectId") for per-project digests`,

  throttle: `Throttle step to limit notification frequency and prevent fatigue.

Common patterns:
- Max 3 per hour per user
- Max 1 per day for marketing
- Throttle by key (e.g., "payload.alertType") for grouped limits`,
};

export function buildStepSystemPrompt(basePrompt: string, variableSchema: JSONSchemaDto): string {
  const variableSchemaPrompt = formatVariableSchemaForPrompt(variableSchema);

  if (variableSchemaPrompt) {
    return `${basePrompt}

## ${getVariableSchemaPrompt(variableSchemaPrompt)}`;
  }

  return basePrompt;
}

export function buildStepUserPrompt(input: z.infer<typeof stepInputSchema>): string {
  return `Step: ${input.name}\nIntent: ${input.intent}\nStep ID: ${input.stepId}`;
}

const EDIT_STEP_INSTRUCTION = `
## Edit Task
Modify the content according to the user's intent. Preserve everything not explicitly asked to change.
Keep the same editorType (block or html for email) and structure. Only update the parts the user requested.`;

export function buildEditStepSystemPrompt(
  basePrompt: string,
  currentControlValues: Record<string, unknown>,
  variableSchema: JSONSchemaDto
): string {
  const variableSchemaPrompt = formatVariableSchemaForPrompt(variableSchema);
  const currentContentJson = JSON.stringify(currentControlValues, null, 2);

  const variableSection = variableSchemaPrompt ? `\n## ${getVariableSchemaPrompt(variableSchemaPrompt)}` : '';

  return `${basePrompt}
${EDIT_STEP_INSTRUCTION}

## Current Step Content
\`\`\`json
${currentContentJson}
\`\`\`
${variableSection}`;
}

export function buildEditStepUserPrompt(input: z.infer<typeof editStepInputSchema>): string {
  return `Step ID: ${input.stepId}\nEdit intent: ${input.intent}`;
}

export const STEP_CONDITION_PROMPT = `Generate a JSONLogic condition for step execution.

## When to use
- Step executes when condition evaluates to true
- Use null to remove the condition (step always executes)

## Merge vs Replace
- ADD/EXTEND: When user says "add", "also", "and", "in addition" - combine existing condition with new using AND: { "and": [existingCondition, newCondition] }
- REPLACE: When user says "change to", "update to", "set to", "replace with" - return the new condition entirely, ignore existing
- REMOVE: When user says "remove", "delete", "clear" - return null

## Variable reference format
Use "var" for variable references: { "var": "path.to.value" }
- payload.*: trigger payload (e.g., payload.amount, payload.priority)
- subscriber.*: subscriber data (e.g., subscriber.firstName, subscriber.isOnline)
- steps.*: previous step state (e.g., steps.welcome-in-app.read, steps.welcome-in-app.seen)

## Common patterns
- Subscriber offline: { "==": [{ "var": "subscriber.isOnline" }, "false"] }
- In-App not read: { "==": [{ "var": "steps.{stepId}.read" }, "false"] }
- In-App not seen: { "==": [{ "var": "steps.{stepId}.seen" }, "false"] }
- Payload value equals: { "==": [{ "var": "payload.priority" }, "high"] }
- Payload value not equals: { "!=": [{ "var": "payload.priority" }, "low"] }
- AND: { "and": [condition1, condition2] }
- OR: { "or": [condition1, condition2] }
- NOT: { "!": [condition] }

## Output
Return only the skip field: JSONLogic object or null.`;

export function buildUpdateStepConditionsSystemPrompt(previousStepIds: string[], existingCondition: unknown): string {
  const stepsContext =
    previousStepIds.length > 0
      ? `\n## Previous steps (use these stepIds in steps.* references)\n${previousStepIds.map((id) => `- ${id}`).join('\n')}`
      : '';

  const existingContext =
    existingCondition != null
      ? `\n## Current condition (merge with AND when user wants to add, replace entirely when user wants to change)\n\`\`\`json\n${JSON.stringify(existingCondition, null, 2)}\n\`\`\``
      : '\n## Current condition: none (step always executes)';

  return `${STEP_CONDITION_PROMPT}${existingContext}${stepsContext}`;
}

export function buildUpdateStepConditionsUserPrompt(input: z.infer<typeof updateStepConditionsInputSchema>): string {
  return `Step ID: ${input.stepId}\nCondition intent: ${input.intent}`;
}
