import { Inject, NotFoundException } from '@nestjs/common';
import {
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
  PinoLogger,
} from '@novu/application-generic';
import { PostActionEnum, type Workflow } from '@novu/framework/internal';
import { Client, NovuHandler, NovuRequestHandler } from '@novu/framework/nest';
import { EnvironmentTypeEnum } from '@novu/shared';
import type { Request, Response } from 'express';
import { getBridgeSecretKeysCacheKey } from './bridge-secret-keys-cache';
import { ConstructFrameworkWorkflow, ConstructFrameworkWorkflowCommand } from './usecases/construct-framework-workflow';

/*
 * A custom framework name is specified for the Novu-managed Bridge endpoint
 * to provide a clear distinction between Novu-managed and self-managed Bridge endpoints.
 */
const frameworkName = 'novu-nest';

/**
 * This class overrides the default NestJS Novu Bridge Client to allow for dynamic construction of
 * workflows to serve on the Novu Bridge.
 */
export class NovuBridgeClient {
  constructor(
    @Inject(NovuHandler) private novuHandler: NovuHandler,
    private constructFrameworkWorkflow: ConstructFrameworkWorkflow,
    private getDecryptedSecretKey: GetDecryptedSecretKey,
    private inMemoryLRUCacheService: InMemoryLRUCacheService,
    private logger: PinoLogger
  ) {}

  public async handleRequest(req: Request, res: Response) {
    const environmentId = req.params.environmentId;
    if (!environmentId || !String(environmentId).trim()) {
      res.status(400).json({
        error: 'Missing or invalid environmentId',
        details: 'The bridge route requires a non-empty environmentId path parameter.',
      });

      return;
    }

    const workflows: Workflow[] = [];

    /*
     * Only construct a workflow when dealing with a POST request to the Novu-managed Bridge endpoint.
     * Non-POST requests don't have a `workflowId` query parameter, so we can't construct a workflow.
     * Those non-POST requests are handled for the purpose of returning a successful health-check.
     */
    if (Object.values(PostActionEnum).includes(req.query.action as PostActionEnum)) {
      const programmaticallyConstructedWorkflow = await this.constructFrameworkWorkflow.execute(
        ConstructFrameworkWorkflowCommand.create({
          environmentId,
          workflowId: req.query.workflowId as string,
          layoutId: req.query.layoutId as string,
          controlValues: req.body.controls,
          action: req.query.action as PostActionEnum,
          skipLayoutRendering: req.query.skipLayoutRendering === 'true',
          jobId: req.query.jobId ? (req.query.jobId as string) : undefined,
          environmentType: req.query.environmentType as EnvironmentTypeEnum | undefined,
        })
      );

      workflows.push(programmaticallyConstructedWorkflow);
    }

    const cacheKey = getBridgeSecretKeysCacheKey(environmentId);
    const storeName = InMemoryLRUCacheStore.VALIDATOR;

    let secretKeys: string[];
    try {
      const resolved = await this.inMemoryLRUCacheService.get(
        storeName,
        cacheKey,
        () =>
          this.getDecryptedSecretKey.executeAll(
            GetDecryptedSecretKeyCommand.create({
              environmentId,
            })
          ),
        {
          environmentId,
          cacheVariant: 'bridge-secret-keys',
        }
      );

      if (!isSecretKeyList(resolved)) {
        this.logger.error(
          `Bridge secret keys missing or invalid after cache lookup (store=${storeName}, cacheKey=${cacheKey}, environmentId=${environmentId})`
        );
        res.status(500).json({
          error: 'Failed to resolve environment secret key',
          details: `Empty or invalid secret from ${storeName} for cache key ${cacheKey}.`,
        });

        return;
      }

      secretKeys = resolved;
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(
          `Environment not found for bridge secret (store=${storeName}, cacheKey=${cacheKey}): ${error.message}`
        );
        res.status(404).json({
          error: 'Environment not found',
          details: `No environment for cache key ${cacheKey} (${storeName}).`,
        });

        return;
      }

      this.logger.error(
        { err: error },
        `Failed to resolve bridge secret key (store=${storeName}, cacheKey=${cacheKey}, environmentId=${environmentId})`
      );
      res.status(500).json({
        error: 'Failed to resolve environment secret key',
        details: `Unexpected error while loading secret via ${storeName} for cache key ${cacheKey}.`,
      });

      return;
    }

    const novuRequestHandler = new NovuRequestHandler({
      frameworkName,
      workflows,
      client: new Client({
        secretKey: secretKeys[0],
        secretKeys,
        strictAuthentication: true,
        verbose: false,
      }),
      handler: this.novuHandler.handler,
    });

    const bridgeHandler = novuRequestHandler.createHandler() as (
      request: Request,
      response: Response
    ) => void | Promise<void>;

    await bridgeHandler(req, res);
  }
}

function isSecretKeyList(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.length > 0 && value.every((key) => typeof key === 'string' && key.trim().length > 0)
  );
}
