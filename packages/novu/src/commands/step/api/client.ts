import axios from 'axios';
import FormData from 'form-data';
import type { DeploymentResult, EnvironmentInfo, StepResolverManifestStep, StepResolverReleaseBundle } from '../types';

export interface RendererConflictStep {
  workflowId: string;
  stepId: string;
}

export class RendererConflictError extends Error {
  constructor(
    message: string,
    public readonly conflictingSteps: RendererConflictStep[]
  ) {
    super(message);
    this.name = 'RendererConflictError';
  }
}

export class StepResolverClient {
  constructor(
    private apiUrl: string,
    private secretKey: string
  ) {}

  private getAuthHeaders() {
    return {
      Authorization: `ApiKey ${this.secretKey}`,
    };
  }

  async validateConnection(): Promise<void> {
    try {
      await axios.get(`${this.apiUrl}/v1/users/me`, {
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your secret key.');
        }
        throw new Error(`Connection failed: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async getEnvironmentInfo(): Promise<EnvironmentInfo> {
    try {
      const response = await axios.get(`${this.apiUrl}/v1/environments/me`, {
        headers: this.getAuthHeaders(),
      });

      const envData = response.data.data;

      return {
        _id: envData._id,
        name: envData.name,
        _organizationId: envData._organizationId,
        type: normalizeEnvironmentType(envData.type),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your secret key.');
        }
        if (error.response?.status === 404) {
          throw new Error('Environment not found. Please ensure your API key has proper permissions.');
        }
        throw new Error(`Failed to fetch environment: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async getStepType(workflowId: string, stepId: string): Promise<string | undefined> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v2/workflows/${encodeURIComponent(workflowId)}/steps/${encodeURIComponent(stepId)}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      const type = response.data?.data?.type;

      return typeof type === 'string' && type.trim().length > 0 ? type.trim() : undefined;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return undefined;
      }

      throw error;
    }
  }

  async deployRelease(
    bundle: StepResolverReleaseBundle,
    manifestSteps: StepResolverManifestStep[]
  ): Promise<DeploymentResult> {
    try {
      const formData = new FormData();
      formData.append('manifest', JSON.stringify({ steps: manifestSteps }));
      formData.append('bundle', Buffer.from(bundle.code, 'utf8'), {
        filename: 'worker.mjs',
        contentType: 'application/javascript+module',
      });

      const response = await axios.post(`${this.apiUrl}/v2/step-resolvers/deploy`, formData, {
        headers: {
          ...this.getAuthHeaders(),
          ...formData.getHeaders(),
        },
        // Limit is enforced on the server side
        maxBodyLength: Infinity,
      });

      const data = response.data.data;
      if (
        typeof data?.stepResolverHash !== 'string' ||
        typeof data?.workerId !== 'string' ||
        typeof data?.deployedAt !== 'string'
      ) {
        throw new Error('Invalid deployment response from API');
      }

      return {
        stepResolverHash: data.stepResolverHash,
        workerId: data.workerId,
        deployedStepsCount: data.deployedStepsCount ?? manifestSteps.length,
        skippedSteps: Array.isArray(data.skippedSteps) ? data.skippedSteps : [],
        deployedAt: data.deployedAt,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiMessage = this.formatApiErrorMessage(error.response?.data, error.message || 'Request failed');

        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your secret key.');
        }
        if (error.response?.status === 400) {
          throw new Error(`Bad request: ${apiMessage}`);
        }
        if (error.response?.status === 409) {
          const data = asRecord(error.response.data);
          const payload = asRecord(data?.data) ?? data;
          if (this.readString(payload?.errorCode) === 'STEP_RENDERER_CONFLICT') {
            const rawSteps = Array.isArray(payload?.conflictingSteps) ? payload.conflictingSteps : [];
            const conflictingSteps: RendererConflictStep[] = rawSteps.flatMap((s) => {
              const step = asRecord(s);
              if (!step) return [];
              const workflowId = this.readString(step.workflowId);
              const stepId = this.readString(step.stepId);
              if (!workflowId || !stepId) return [];
              return [{ workflowId, stepId }];
            });
            throw new RendererConflictError(
              this.readString(payload?.message) ?? 'Step is managed by the block editor',
              conflictingSteps
            );
          }
          throw new Error(`Conflict: ${apiMessage}`);
        }
        if (error.response?.status === 404) {
          const stepContext = this.extractStepContext(error.response.data);
          if (stepContext) {
            throw new Error(`Not found: ${stepContext}. Make sure the workflow and its steps exist before publishing.`);
          }
          throw new Error('Workflow or step not found. Make sure the workflow and its steps exist before publishing.');
        }
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (error.response?.status >= 500) {
          throw new Error(`Server error (${error.response.status}): ${apiMessage || 'Internal server error'}`);
        }

        throw new Error(`Deployment failed (${error.response?.status || 'unknown'}): ${apiMessage}`);
      }

      if (error instanceof Error) {
        throw new Error(`Network error: ${error.message}`);
      }

      throw new Error('Unknown deployment error occurred');
    }
  }

  private formatApiErrorMessage(data: unknown, fallback: string): string {
    const root = asRecord(data);
    if (!root) {
      return fallback;
    }

    const baseMessage = this.readMessage(root) ?? this.readString(root.error) ?? fallback;
    const stepContext = this.extractStepContext(root);

    if (!stepContext) {
      return baseMessage;
    }

    return `${baseMessage} (${stepContext})`;
  }

  private readMessage(payload: Record<string, unknown>): string | undefined {
    const rawMessage = payload.message;

    if (typeof rawMessage === 'string' && rawMessage.trim().length > 0) {
      return rawMessage;
    }

    if (Array.isArray(rawMessage)) {
      const messages = rawMessage.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      );
      if (messages.length > 0) {
        return messages.join(', ');
      }
    }

    const messageRecord = asRecord(rawMessage);
    if (messageRecord) {
      const nestedMessage = this.readString(messageRecord.message);
      if (nestedMessage) {
        return nestedMessage;
      }
    }

    return undefined;
  }

  private extractStepContext(payload: Record<string, unknown>): string | undefined {
    const possibleSources: Record<string, unknown>[] = [payload];
    const ctx = asRecord(payload.ctx);
    if (ctx) {
      possibleSources.push(ctx);
    }

    const nestedMessage = asRecord(payload.message);
    if (nestedMessage) {
      possibleSources.push(nestedMessage);
    }

    for (const source of possibleSources) {
      const workflowId = this.readString(source.workflowId);
      const stepId = this.readString(source.stepId);

      if (workflowId && stepId) {
        return `workflowId=${workflowId}, stepId=${stepId}`;
      }
      if (workflowId) {
        return `workflowId=${workflowId}`;
      }
      if (stepId) {
        return `stepId=${stepId}`;
      }
    }

    return undefined;
  }

  private readString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}

function normalizeEnvironmentType(raw: unknown): 'prod' | 'dev' {
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : '';

  if (normalized === 'dev' || normalized === 'development') {
    return 'dev';
  }

  // Default to 'prod' for 'prod', 'production', unknown, or missing values
  // so that unexpected API strings cannot bypass the production guard.
  return 'prod';
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}
