import { API_HOSTNAME } from '@/config';

export interface WorkflowTriggerPromptConfig {
  workflowId: string;
  workflowName: string;
  apiKey: string;
  subscriberData: Record<string, string>;
  payload: Record<string, unknown>;
  backendUrl?: string;
}

interface CodeSnippetConfig {
  workflowId: string;
  subscriberData: Record<string, string>;
  payload: Record<string, unknown>;
  apiKey: string;
  backendUrl: string;
}

/**
 * Generates code snippets for different languages/frameworks
 */
const generateCodeSnippets = (config: CodeSnippetConfig) => {
  const { workflowId, subscriberData, payload, apiKey, backendUrl } = config;
  const payloadJson = JSON.stringify(payload, null, 2);
  const subscriberId = subscriberData.subscriberId || 'user-id';
  const subscriberEmail = subscriberData.email || 'user@example.com';

  // Escape single quotes for safe interpolation into single-quoted strings
  const escapeForSingleQuotes = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const subscriberIdEscaped = escapeForSingleQuotes(subscriberId);
  const subscriberEmailEscaped = escapeForSingleQuotes(subscriberEmail);

  return {
    nodejs: `import { Novu } from '@novu/api';

const novu = new Novu({ 
  secretKey: process.env.NOVU_SECRET_KEY 
});

await novu.trigger({
  workflowId: '${workflowId}',
  to: {
    subscriberId: '${subscriberIdEscaped}',
    email: '${subscriberEmailEscaped}',
  },
  payload: ${payloadJson.replace(/\n/g, '\n  ')},
});`,

    python: `from novu_py import Novu
import os

novu = Novu(secret_key=os.environ['NOVU_SECRET_KEY'])

novu.trigger(
    trigger_event_request_dto={
        'workflow_id': '${workflowId}',
        'to': {'subscriber_id': '${subscriberIdEscaped}', 'email': '${subscriberEmailEscaped}'},
        'payload': ${payloadJson.replace(/\n/g, '\n        ')},
    }
)`,

    curl: `curl -X POST '${backendUrl}/v1/events/trigger' \\
  -H 'Authorization: ApiKey ${apiKey}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "name": "${workflowId}",
    "to": {
      "subscriberId": "${subscriberId}",
      "email": "${subscriberEmail}"
    },
    "payload": ${payloadJson.replace(/\n/g, '\n    ')}
  }'`,
  };
};

/**
 * Generates sections for the AI prompt based on available data
 */
const generatePromptSections = (config: WorkflowTriggerPromptConfig) => {
  const { workflowId, workflowName, apiKey, subscriberData, payload, backendUrl = API_HOSTNAME } = config;

  const hasPayload = Object.keys(payload).length > 0;
  const snippets = generateCodeSnippets({ workflowId, subscriberData, payload, apiKey, backendUrl });

  return {
    header: `You are an AI agent specialized in integrating Novu workflow triggers into applications. Your primary goal is to seamlessly embed workflow trigger calls into existing codebases while maintaining the host application's design patterns and architecture.

**Critical**: You must write clean, minimal code implementation only. Do not create documentation, guides, README files, or any markdown files. Do not add console logs or verbose error handling. Focus exclusively on integrating the workflow trigger into the existing codebase with the least amount of code possible.`,

    workflowInfo: {
      title: 'Workflow Information',
      content: `**Workflow ID**: ${workflowId}
**Workflow Name**: ${workflowName}
**Novu API Endpoint**: ${backendUrl}/v1/events/trigger
**API Key**: ${apiKey}

**Subscriber Information**:
${Object.entries(subscriberData)
  .map(([key, value]) => `- ${key}: "${value}"`)
  .join('\n')}${
  hasPayload
    ? `

**Expected Payload Fields**:
${Object.entries(payload)
  .map(([key, value]) => `- ${key}: ${typeof value} (example: ${JSON.stringify(value)})`)
  .join('\n')}`
    : ''
}`,
    },

    objectives: {
      title: 'Primary Objectives',
      content: `- **Smart Placement**: Identify the optimal location to trigger this workflow based on the application's business logic
- **Framework Adaptation**: Use the appropriate Novu SDK or HTTP client based on the tech stack
- **Minimal Integration**: Add only the necessary code with no extra noise
- **Pattern Respect**: Follow the host application's development patterns (async/await, error handling, code style, etc.)`,
    },

    contextAnalysis: {
      title: 'Context Analysis Requirements',
      subsections: [
        {
          title: 'Pre-Integration Assessment',
          content: `Before starting the integration, analyze the host application to understand:

**Project Structure Analysis**:
- [ ] Programming language and runtime (Node.js, Python, PHP, Go, etc.)
- [ ] Package manager (npm, pnpm, yarn, pip, composer, etc.)
- [ ] Framework (Next.js, Express, NestJS, Django, Laravel, etc.)
- [ ] Existing API client patterns
- [ ] Authentication/user management system
- [ ] Error handling patterns

**Trigger Placement Analysis**:
Identify where this workflow should be triggered based on business logic:
- [ ] User registration/signup flows
- [ ] Payment/transaction completions
- [ ] Status changes (order shipped, ticket closed, etc.)
- [ ] Scheduled/cron jobs
- [ ] Webhook handlers
- [ ] API endpoints`,
        },
      ],
    },

    constraints: {
      title: 'Critical Constraints & Requirements',
      subsections: [
        {
          title: 'Always Do',
          content: `- **Write Code Only**: Deliver actual code implementation, not documentation or guides
- **Keep It Simple**: Focus on clean, minimal integration without unnecessary complexity
- **Follow Patterns**: Match the existing code style, patterns, and conventions
- **Environment Variables**: Store the API key in environment variables (e.g., NOVU_SECRET_KEY)
- **Type Safety**: Use proper typing (TypeScript interfaces, PHP types, Python type hints, etc.)
- **Async/Await**: Use appropriate async patterns for the language/framework
- **Subscriber Context**: Extract subscriber data from the authenticated user or context${
            hasPayload ? '\n- **Payload Validation**: Ensure all required payload fields are provided' : ''
          }`,
        },
        {
          title: 'Never Do',
          content: `- **Hardcode Secrets**: Never hardcode the API key in the source code
- **Add Console Logs**: Do not add console.log, console.error, or print statements
- **Over-Engineer**: Avoid unnecessary complexity, verbose error handling, or excessive try-catch blocks
- **Block Main Thread**: Don't make synchronous HTTP calls if async is available
- **Skip Validation**: Validate subscriber and payload data before triggering
- **Create Unnecessary Files**: Work within existing file structure when possible
- **Generate Documentation**: Do not create README.md, guides, or any markdown files - focus solely on code implementation`,
        },
      ],
    },

    implementation: {
      title: 'Implementation Checklist',
      steps: [
        {
          number: 1,
          title: 'Package Installation',
          objective: 'Install the appropriate Novu SDK or HTTP client',
          actions: `1. Detect the project's tech stack and package manager
2. Choose the appropriate integration method:
   - **Node.js**: Install @novu/api package
   - **Python**: Install novu-py package  
   - **PHP**: Install novuhq/novu package
   - **Go**: Use github.com/novuhq/novu-go
   - **Other**: Use native HTTP client (fetch, axios, curl, etc.)`,
          verification: `- [ ] Package installed successfully
- [ ] No dependency conflicts`,
        },
        {
          number: 2,
          title: 'Environment Configuration',
          objective: 'Set up environment variables for API key',
          actions: `1. Identify the environment file (.env, .env.local, config.php, etc.)
2. Add the Novu API key:
\`\`\`env
NOVU_SECRET_KEY=${apiKey}
\`\`\``,
          verification: `- [ ] Environment variable is accessible in the application
- [ ] API key is not committed to version control`,
        },
        {
          number: 3,
          title: 'Identify Trigger Location',
          objective: 'Find the optimal place to trigger the workflow',
          actions: `1. Analyze the business logic and workflow purpose
2. Locate the relevant code section (controller, service, handler, etc.)
3. Identify the point where all required data is available

**Example Locations**:
- After user signup: \`UserController.register()\`
- After payment: \`PaymentService.processPayment()\`
- On status change: \`OrderService.updateStatus()\`
- Scheduled task: \`CronJobs.dailyDigest()\``,
        },
        {
          number: 4,
          title: 'Extract Subscriber Data',
          objective: 'Get subscriber information from the application context',
          actions: `1. Identify the authenticated user or target recipient
2. Extract required subscriber fields:
   - subscriberId (required)${subscriberData.email ? '\n   - email (recommended)' : ''}${
     subscriberData.firstName || subscriberData.lastName ? '\n   - firstName, lastName (optional)' : ''
   }

**Example Patterns**:
\`\`\`typescript
// Node.js/Express
const subscriberId = req.user.id;
const email = req.user.email;

// Next.js
const { userId, user } = auth();

// Django
subscriber_id = request.user.id
email = request.user.email
\`\`\``,
        },
        ...(hasPayload
          ? [
              {
                number: 5,
                title: 'Prepare Payload Data',
                objective: 'Collect all required payload fields for the workflow',
                actions: `1. Gather the required data based on the workflow's payload schema
2. Create a payload object with the necessary fields
3. Validate that all required fields are present

**Required Payload Fields**:
${Object.entries(payload)
  .map(([key, value]) => `- ${key}: ${typeof value}`)
  .join('\n')}`,
              },
            ]
          : []),
        {
          number: hasPayload ? 6 : 5,
          title: 'Implement Trigger Call',
          objective: 'Add the workflow trigger code',
          implementations: [
            {
              language: 'Node.js (with @novu/api)',
              code: snippets.nodejs,
            },
            {
              language: 'Python (with novu-py)',
              code: snippets.python,
            },
            {
              language: 'cURL (direct HTTP call)',
              code: snippets.curl,
            },
          ],
        },
        {
          number: hasPayload ? 7 : 6,
          title: 'Error Handling',
          objective: 'Handle errors gracefully without breaking the main flow',
          requirements: `- [ ] Use try-catch only if the application already uses this pattern
- [ ] Don't break the main application flow if trigger fails
- [ ] Follow the existing error handling patterns in the codebase
- [ ] Keep error handling minimal and clean`,
          example: `try {
  await novu.trigger({...});
} catch {
  // Silently handle - notification failures shouldn't break the app
}`,
        },
        {
          number: hasPayload ? 8 : 7,
          title: 'Testing & Validation',
          objective: 'Ensure the integration works correctly',
          checklist: `- [ ] API key is loaded from environment variables
- [ ] Subscriber ID is correctly extracted${hasPayload ? '\n- [ ] Payload contains all required fields' : ''}
- [ ] Error handling follows existing patterns
- [ ] No blocking operations in critical paths
- [ ] Integration is clean and minimal`,
        },
      ],
    },

    finalDeliverables: {
      title: 'Final Deliverables',
      content: `When completing this integration, ensure:

1. **Clean & Simple**: Minimal code that follows existing patterns
2. **Type Safety**: Proper typing throughout
3. **Error Resilience**: Won't break the application if Novu is unavailable
4. **Environment-Based**: API key in environment variables
5. **Well-Placed**: Trigger location makes business sense
6. **No Noise**: No console logs, verbose comments, or unnecessary code`,
    },

    useCases: {
      title: 'Example Use Cases',
      examples: [
        '**User Registration**: Trigger when a new user signs up to send a welcome email',
        '**Order Confirmation**: Trigger when an order is placed to send confirmation notifications',
        '**Status Updates**: Trigger when a status changes (shipped, delivered, etc.)',
        '**Scheduled Digests**: Trigger from a cron job to send daily/weekly summaries',
      ],
    },

    closingNote: `Remember: Focus on clean, minimal code that fits naturally into the existing codebase. The workflow trigger should feel like a native part of the application, not a bolted-on feature.

**Final Reminder**: Deliver working code only - no README files, no setup guides, no markdown documentation, no console logs. Your output should be production-ready code that can be immediately integrated into the application with zero noise.`,
  };
};

/**
 * Formats a section with title and content
 */
function formatSection(title: string, content: string, level = 2): string {
  const heading = '#'.repeat(level);
  return `${heading} ${title}\n\n${content}`;
}

/**
 * Formats an implementation step
 */
function formatStep(step: {
  number: number;
  title: string;
  objective?: string;
  actions?: string;
  verification?: string;
  requirements?: string;
  checklist?: string;
  example?: string;
  implementations?: Array<{ language: string; code: string }>;
}): string {
  let result = `### Step ${step.number}: ${step.title}\n`;

  if (step.objective) {
    result += `**Objective**: ${step.objective}\n\n`;
  }

  if (step.actions) {
    result += `**Actions**:\n${step.actions}\n\n`;
  }

  if (step.implementations) {
    result += `**Implementation Examples**:\n\n`;
    for (const impl of step.implementations) {
      result += `**${impl.language}**:\n\`\`\`\n${impl.code}\n\`\`\`\n\n`;
    }
  }

  if (step.requirements) {
    result += `**Requirements**:\n${step.requirements}\n\n`;
  }

  if (step.example) {
    result += `**Example**:\n\`\`\`\n${step.example}\n\`\`\`\n\n`;
  }

  if (step.verification) {
    result += `**Verification**:\n${step.verification}\n\n`;
  }

  if (step.checklist) {
    result += `**Validation Checklist**:\n${step.checklist}\n\n`;
  }

  return result;
}

/**
 * Generates an AI-ready prompt to help integrate Novu workflow triggers
 */
export function generateWorkflowTriggerAIPrompt(config: WorkflowTriggerPromptConfig): string {
  const sections = generatePromptSections(config);
  const parts: string[] = [];

  // Header
  parts.push(sections.header);
  parts.push('');

  // Workflow Information
  parts.push(formatSection(sections.workflowInfo.title, sections.workflowInfo.content));
  parts.push('---\n');

  // Objectives
  parts.push(formatSection(sections.objectives.title, sections.objectives.content));
  parts.push('---\n');

  // Context Analysis
  parts.push(formatSection(sections.contextAnalysis.title, ''));
  for (const subsection of sections.contextAnalysis.subsections) {
    parts.push(formatSection(subsection.title, subsection.content, 3));
  }
  parts.push('---\n');

  // Constraints
  parts.push(formatSection(sections.constraints.title, ''));
  for (const subsection of sections.constraints.subsections) {
    parts.push(formatSection(subsection.title, subsection.content, 3));
  }
  parts.push('---\n');

  // Implementation
  parts.push(formatSection(sections.implementation.title, ''));
  for (const step of sections.implementation.steps) {
    parts.push(formatStep(step));
  }
  parts.push('---\n');

  // Final Deliverables
  parts.push(formatSection(sections.finalDeliverables.title, sections.finalDeliverables.content));
  parts.push('---\n');

  // Use Cases
  parts.push(formatSection(sections.useCases.title, sections.useCases.examples.join('\n\n')));
  parts.push('---\n');

  // Closing Note
  parts.push(sections.closingNote);

  return parts.join('\n');
}
