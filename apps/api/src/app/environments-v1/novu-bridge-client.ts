import { Inject, Injectable, Scope } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PostActionEnum, type Workflow } from '@novu/framework/internal';
import { Client, NovuHandler, NovuRequestHandler } from '@novu/framework/nest';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '@novu/application-generic';
import { ConstructFrameworkWorkflow, ConstructFrameworkWorkflowCommand } from './usecases/construct-framework-workflow';

/*
 * A custom framework name is specified for the Novu-managed Bridge endpoint
 * to provide a clear distinction between Novu-managed and self-managed Bridge endpoints.
 */
export const frameworkName = 'novu-nest';

/**
 * This class overrides the default NestJS Novu Bridge Client to allow for dynamic construction of
 * workflows to serve on the Novu Bridge.
 */
@Injectable({ scope: Scope.REQUEST })
export class NovuBridgeClient {
  public novuRequestHandler: NovuRequestHandler | null = null;

  constructor(
    @Inject(NovuHandler) private novuHandler: NovuHandler,
    private constructFrameworkWorkflow: ConstructFrameworkWorkflow,
    private getDecryptedSecretKey: GetDecryptedSecretKey
  ) {}

  public async handleRequest(req: Request, res: Response) {
    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: req.params.environmentId,
      })
    );

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
          controlValues: req.body.controls,
          action: req.query.action as PostActionEnum,
        })
      );

      workflows.push(programmaticallyConstructedWorkflow);
    }

    this.novuRequestHandler = new NovuRequestHandler({
      frameworkName,
      workflows,
      client: new Client({ secretKey, strictAuthentication: true }),
      handler: this.novuHandler.handler,
    });

    await this.novuRequestHandler.createHandler()(req, res);
  }
}
