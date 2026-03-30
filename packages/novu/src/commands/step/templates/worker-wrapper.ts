import * as path from 'path';
import type { DiscoveredStep } from '../types';

export function generateWorkerWrapper(steps: DiscoveredStep[], rootDir: string): string {
  return [
    generateImports(steps, rootDir),
    generateValidatorPrecompilation(steps),
    generateStepHandlersMap(steps),
    generateWorkerUtilities(),
    generateFetchHandler(),
  ].join('\n\n');
}

function generateImports(steps: DiscoveredStep[], rootDir: string): string {
  const stepImports = steps
    .map((s, i) => `import stepHandler${i} from ${JSON.stringify(getImportPath(s.filePath, rootDir))};`)
    .join('\n');

  return `import { validateData } from '@novu/framework/validators';
import { actionStepSchemas, channelStepSchemas, providerSchemas } from '@novu/framework/step-resolver';\n${stepImports}`;
}

function generateValidatorPrecompilation(steps: DiscoveredStep[]): string {
  const handlerRefs = steps.map((_, i) => `stepHandler${i}`).join(', ');

  return `// Pre-compile all JSON Schema validators during the startup phase.
// Cloudflare Workers allow new Function() (used by AJV) during startup but not during request handling.
// JsonSchemaValidator caches compiled validators by schema object reference, so these pre-compiled
// validators are reused on every request without triggering new Function() again.
await Promise.all([
  ...Object.values(channelStepSchemas).map(({ output }) =>
    validateData(output, {})
  ),
  ...Object.values(actionStepSchemas).map(({ output }) =>
    validateData(output, {})
  ),
  ...[${handlerRefs}].flatMap(handler => {
    const schemas = [];
    if (handler.controlSchema) schemas.push(validateData(handler.controlSchema, {}));
    if (handler.providers && providerSchemas[handler.type]) {
      for (const key of Object.keys(handler.providers)) {
        const providerSchema = providerSchemas[handler.type]?.[key]?.output;
        if (providerSchema) schemas.push(validateData(providerSchema, {}));
      }
    }
    return schemas;
  }),
]);`;
}

function generateStepHandlersMap(steps: DiscoveredStep[]): string {
  const entries = steps
    .map((s, i) => `  [${JSON.stringify(s.workflowId)} + '/' + stepHandler${i}.stepId, stepHandler${i}]`)
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
      return jsonResponse({
        error: 'STEP_HANDLER_ERROR',
        message: error instanceof Error ? error.message : String(error),
      }, 500);
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

      ${generateSchemaValidation()}

      ${generateSkipCheck()}

      const result = await step.resolve(validatedControls, { payload, subscriber, context, steps: stepOutputs, env });

      ${generateOutputValidation()}

      ${generateProviderExecution()}

      return jsonResponse(
        {
          outputs: validatedResult,
          providers,
          options: { skip: false },
          metadata: {
            status: 'success',
            error: false,
            duration: Date.now() - startTime,
            stepType: step.type,
            disableOutputSanitization: step.disableOutputSanitization === true,
          },
        },
        200
      );`;
}

function generateBodyValidation(): string {
  return `const startTime = Date.now();

      let body = {};
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
      const env = isObject(body.env) ? body.env : {};
      const stateArray = Array.isArray(body.state) ? body.state : [];
      const stepOutputs = stateArray.reduce((acc, s) => { if (s && typeof s.stepId === 'string') acc[s.stepId] = s.outputs ?? {}; return acc; }, {});
      const controls = body.controls ?? {};
      const isPreview = body.action === 'preview';

      if (!isObject(payload) || !isObject(subscriber) || !isObject(context) || !isObject(stepOutputs) || !isObject(controls)) {
        return jsonResponse(
          { error: 'Invalid request body', message: 'payload, subscriber, context, steps, and controls must be JSON objects' },
          400
        );
      }`;
}

function generateSchemaValidation(): string {
  return `let validatedControls = controls;
      if (step.controlSchema) {
        const controlsResult = await validateData(step.controlSchema, controls);
        if (!controlsResult.success) {
          return jsonResponse(
            { error: 'INVALID_CONTROLS', message: 'Controls failed schema validation', details: controlsResult.errors },
            400
          );
        }
        validatedControls = controlsResult.data;
      }`;
}

function generateSkipCheck(): string {
  return `if (!isPreview && step.skip) {
        const shouldSkip = await step.skip(validatedControls, { payload, subscriber, context, steps: stepOutputs, env });
        if (shouldSkip) {
          return jsonResponse(
            {
              outputs: {},
              providers: {},
              options: { skip: true },
              metadata: {
                status: 'success',
                error: false,
                duration: Date.now() - startTime,
                stepType: step.type,
                disableOutputSanitization: step.disableOutputSanitization === true,
              },
            },
            200
          );
        }
      }`;
}

function generateOutputValidation(): string {
  return `const outputSchema = channelStepSchemas[step.type]?.output ?? actionStepSchemas[step.type]?.output;
      let validatedResult = result;
      if (outputSchema) {
        const outputResult = await validateData(outputSchema, result);
        if (!outputResult.success) {
          return jsonResponse(
            { error: 'INVALID_OUTPUT', message: 'Step output failed schema validation', details: outputResult.errors },
            400
          );
        }
        validatedResult = outputResult.data ?? result;
      }`;
}

function generateProviderExecution(): string {
  return `const providers = {};
      if (step.providers) {
        const ctx = { payload, subscriber, context, steps: stepOutputs, env };
        for (const [providerKey, providerResolve] of Object.entries(step.providers)) {
          const providerResult = await providerResolve({ controls: validatedControls, outputs: validatedResult }, ctx);
          const providerOutputSchema = providerSchemas[step.type]?.[providerKey]?.output;
          if (providerOutputSchema) {
            const providerValidation = await validateData(providerOutputSchema, providerResult);
            if (!providerValidation.success) {
              return jsonResponse(
                { error: 'INVALID_PROVIDER_OUTPUT', provider: providerKey, message: 'Provider output failed schema validation', details: providerValidation.errors },
                400
              );
            }
            const validated = providerValidation.data ?? providerResult;
            providers[providerKey] = providerResult._passthrough !== undefined
              ? { ...validated, _passthrough: providerResult._passthrough }
              : validated;
          } else {
            providers[providerKey] = providerResult;
          }
        }
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
