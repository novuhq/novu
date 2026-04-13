import { Inject } from '@nestjs/common';
import { PostActionEnum, type Workflow } from '@novu/framework/internal';
import { Client, NovuHandler, NovuRequestHandler } from '@novu/framework/nest';
import { EnvironmentTypeEnum } from '@novu/shared';
import type { Request, Response } from 'express';
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
    private constructFrameworkWorkflow: ConstructFrameworkWorkflow
  ) {}

  public async handleRequest(req: Request, res: Response) {
    const workflows: Workflow[] = [];

    /*
     * Only construct a workflow when dealing with a POST request to the Novu-managed Bridge endpoint.
     * Non-POST requests don't have a `workflowId` query parameter, so we can't construct a workflow.
     * Those non-POST requests are handled for the purpose of returning a successful health-check.
     */
    if (Object.values(PostActionEnum).includes(req.query.action as PostActionEnum)) {
      const programmaticallyConstructedWorkflow = await this.constructFrameworkWorkflow.execute(
        ConstructFrameworkWorkflowCommand.create({
          environmentId: req.params.environmentId,
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

    const novuRequestHandler = new NovuRequestHandler({
      frameworkName,
      workflows,
      client: new Client({ secretKey: 'INTERNAL_KEY', strictAuthentication: false, verbose: false }),
      handler: this.novuHandler.handler,
    });

    await novuRequestHandler.createHandler()(req as any, res as any);
  }
}
