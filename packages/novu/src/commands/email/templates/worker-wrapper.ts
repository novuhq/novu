import * as path from 'path';
import type { DiscoveredStep } from '../types';

export function generateWorkerWrapper(steps: DiscoveredStep[], rootDir: string): string {
  return [
    generateImports(steps, rootDir),
    generateStepHandlersMap(steps),
    generateWorkerUtilities(),
    generateFetchHandler(),
  ].join('\n\n');
}

function generateImports(steps: DiscoveredStep[], rootDir: string): string {
  return steps
    .map(
      (s, i) =>
        `import stepHandler${i}, { stepId as stepId${i}, workflowId as workflowId${i} } from ${JSON.stringify(getImportPath(s.filePath, rootDir))};`
    )
    .join('\n');
}

function generateStepHandlersMap(steps: DiscoveredStep[]): string {
  const entries = steps
    .map(
      (s, i) =>
        `  [${JSON.stringify(`${s.workflowId}/${s.stepId}`)}, { handler: stepHandler${i}, stepId: stepId${i}, workflowId: workflowId${i} }]`
    )
    .join(',\n');

  return `const stepHandlers = new Map([\n${entries}\n]);`;
}

function generateWorkerUtilities(): string {
  return `const JSON_HEADERS = { 'Content-Type': 'application/json' };

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}`;
}

function generateFetchHandler(): string {
  return `export default {
  async fetch(request) {
    try {
      ${generateRequestHandler()}
    } catch (error) {
      console.error('Error executing step handler:', error);
      return jsonResponse({ error: 'Step execution failed', message: 'Internal server error' }, 500);
    }
  },
};`;
}

function generateRequestHandler(): string {
  return `if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
      }

      const url = new URL(request.url);
      const workflowId = url.searchParams.get('workflowId');
      const stepId = url.searchParams.get('stepId');

      if (!workflowId || !stepId) {
        return jsonResponse(
          { error: 'Missing routing params', message: 'Provide workflowId and stepId as query params' },
          400
        );
      }

      const stepKey = \`\${workflowId}/\${stepId}\`;
      const step = stepHandlers.get(stepKey);
      if (!step) {
        return jsonResponse(
          { error: 'Step not found', workflowId, stepId, available: Array.from(stepHandlers.keys()) },
          404
        );
      }

      ${generateBodyValidation()}

      const result = await step.handler({ payload, subscriber, context, steps: stepOutputs, controls });

      return jsonResponse(
        { stepId: step.stepId, workflowId: step.workflowId, subject: result.subject, body: result.body },
        200
      );`;
}

function generateBodyValidation(): string {
  return `let body = {};
      const rawBody = await request.text();
      if (rawBody) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          return jsonResponse({ error: 'Invalid JSON body' }, 400);
        }
      }

      if (!isObject(body)) {
        return jsonResponse({ error: 'Invalid request body', message: 'Body must be a JSON object' }, 400);
      }

      const payload = body.payload ?? {};
      const subscriber = body.subscriber ?? {};
      const context = body.context ?? {};
      const stepOutputs = body.steps ?? {};
      const controls = body.controls ?? {};

      if (!isObject(payload) || !isObject(subscriber) || !isObject(context) || !isObject(stepOutputs) || !isObject(controls)) {
        return jsonResponse(
          { error: 'Invalid request body', message: 'payload, subscriber, context, steps, and controls must be JSON objects' },
          400
        );
      }`;
}

function getImportPath(filePath: string, rootDir: string): string {
  // Use rootDir-relative imports so esbuild can resolve local step handlers.
  const withoutExt = filePath.replace(/\.(ts|tsx|js|jsx)$/, '');
  const normalizedRootDir = path.resolve(rootDir);
  const relativeImportPath = path.relative(normalizedRootDir, withoutExt).split(path.sep).join('/');

  if (relativeImportPath.startsWith('.') || relativeImportPath.startsWith('/')) {
    return relativeImportPath;
  }

  return `./${relativeImportPath}`;
}
