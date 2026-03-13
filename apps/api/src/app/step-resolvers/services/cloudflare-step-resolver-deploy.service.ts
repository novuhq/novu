import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';

const CF_COMPATIBILITY_DATE = '2025-11-18';
const WORKER_SCRIPT_NAME = 'worker.js';
const DEPLOY_TIMEOUT_MS = 30_000;

interface DeployStepResolverToCloudflareCommand {
  workerId: string;
  organizationId: string;
  stepResolverHash: string;
  bundleBuffer: Buffer;
}

interface CloudflareDeploymentConfig {
  accountId: string;
  apiToken: string;
  dispatchNamespace: string;
  compatibilityDate: string;
}

interface CloudflareDeploymentError {
  message?: string;
}

interface CloudflareDeploymentResponse {
  success?: boolean;
  errors?: CloudflareDeploymentError[];
}

@Injectable()
export class CloudflareStepResolverDeployService {
  constructor(private logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  async deploy(command: DeployStepResolverToCloudflareCommand): Promise<void> {
    const config = this.getConfigOrThrow();
    const url = this.buildDeployUrl(config, command.workerId);
    const logContext = this.buildLogContext(command);

    try {
      this.logger.info(logContext, 'Sending Cloudflare step resolver deploy request');

      const response = await this.sendDeployRequest(url, config, command);
      const rawBody = await response.text();
      const parsedBody = this.safeJsonParse<CloudflareDeploymentResponse>(rawBody);

      this.logger.info(
        {
          ...logContext,
          statusCode: response.status,
          ok: response.ok,
        },
        'Cloudflare step resolver deploy response'
      );

      const isSuccess = response.ok && parsedBody?.success !== false;
      if (isSuccess) {
        return;
      }

      const errorMessage = this.extractCloudflareErrorMessage(parsedBody, rawBody, response.status);

      throw this.toServiceUnavailableException(response.status, errorMessage);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TimeoutError') {
        this.logger.error(logContext, `Cloudflare deploy request timed out after ${DEPLOY_TIMEOUT_MS}ms`);
        throw new ServiceUnavailableException(`Cloudflare deployment request timed out after ${DEPLOY_TIMEOUT_MS}ms`);
      }

      const formattedError = this.formatUnknownError(error);

      this.logger.error(
        {
          ...logContext,
          error: formattedError,
        },
        'Cloudflare deploy request failed'
      );

      throw new ServiceUnavailableException(`Cloudflare deployment request failed: ${formattedError}`);
    }
  }

  private buildLogContext(command: DeployStepResolverToCloudflareCommand) {
    return {
      workerId: command.workerId,
      organizationId: command.organizationId,
      stepResolverHash: command.stepResolverHash,
    };
  }

  private async sendDeployRequest(
    url: string,
    config: CloudflareDeploymentConfig,
    command: DeployStepResolverToCloudflareCommand
  ): Promise<Response> {
    const metadata = {
      main_module: WORKER_SCRIPT_NAME,
      compatibility_date: config.compatibilityDate,
      tags: this.buildTags(command.organizationId, command.stepResolverHash),
    };

    const formData = new FormData();
    formData.append(
      WORKER_SCRIPT_NAME,
      new Blob([command.bundleBuffer], { type: 'application/javascript+module' }),
      WORKER_SCRIPT_NAME
    );
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));

    return fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: formData,
      signal: AbortSignal.timeout(DEPLOY_TIMEOUT_MS),
    });
  }

  private getConfigOrThrow(): CloudflareDeploymentConfig {
    const accountId = process.env.STEP_RESOLVER_CF_ACCOUNT_ID;
    const apiToken = process.env.STEP_RESOLVER_CF_API_TOKEN;
    const dispatchNamespace = process.env.STEP_RESOLVER_CF_DISPATCH_NAMESPACE;

    const missingVariables = [
      ['STEP_RESOLVER_CF_ACCOUNT_ID', accountId],
      ['STEP_RESOLVER_CF_API_TOKEN', apiToken],
      ['STEP_RESOLVER_CF_DISPATCH_NAMESPACE', dispatchNamespace],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missingVariables.length > 0) {
      throw new ServiceUnavailableException(
        `Step resolver deployment is not configured. Missing: ${missingVariables.join(', ')}`
      );
    }

    return {
      accountId: accountId!,
      apiToken: apiToken!,
      dispatchNamespace: dispatchNamespace!,
      compatibilityDate: CF_COMPATIBILITY_DATE,
    };
  }

  private buildDeployUrl(config: CloudflareDeploymentConfig, workerId: string): string {
    const accountId = encodeURIComponent(config.accountId);
    const namespace = encodeURIComponent(config.dispatchNamespace);
    const scriptName = encodeURIComponent(workerId);

    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/dispatch/namespaces/${namespace}/scripts/${scriptName}`;
  }

  private buildTags(organizationId: string, stepResolverHash: string): string[] {
    return [`orgId:${organizationId}`, `stepResolverHash:${stepResolverHash}`];
  }

  private toServiceUnavailableException(statusCode: number, message: string): ServiceUnavailableException {
    if (statusCode === 401 || statusCode === 403) {
      return new ServiceUnavailableException(`Cloudflare authentication failed: ${message}`);
    }

    if (statusCode === 429 || statusCode >= 500) {
      return new ServiceUnavailableException(`Cloudflare deployment temporarily unavailable: ${message}`);
    }

    return new ServiceUnavailableException(`Cloudflare deployment failed: ${message}`);
  }

  private extractCloudflareErrorMessage(
    payload: CloudflareDeploymentResponse | undefined,
    rawBody: string,
    statusCode: number
  ): string {
    return (
      payload?.errors?.find((error) => error?.message)?.message ||
      rawBody.trim() ||
      `Cloudflare responded with status ${statusCode}`
    );
  }

  private safeJsonParse<T>(raw: string): T | undefined {
    if (!raw) {
      return undefined;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  private formatUnknownError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
