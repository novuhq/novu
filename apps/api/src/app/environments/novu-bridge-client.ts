import { Injectable, Inject, Scope } from '@nestjs/common';
import type { Request, Response } from 'express';

import { Client, PostActionEnum, NovuRequestHandler, Workflow } from '@novu/framework';
// @ts-expect-error - TODO: bundle CJS with @novu/framework
import { NovuHandler } from '@novu/framework/nest';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '@novu/application-generic';
import { ConstructFrameworkWorkflow, ConstructFrameworkWorkflowCommand } from './usecases/construct-framework-workflow';

export const frameworkName = 'novu-nest';

@Injectable({ scope: Scope.REQUEST })
export class NovuBridgeClient {
  public novuRequestHandler: NovuRequestHandler | null = null;

  constructor(
    @Inject(NovuHandler) private novuHandler: NovuHandler,
    private createFrameworkWorkflow: ConstructFrameworkWorkflow,
    private getDecryptedSecretKey: GetDecryptedSecretKey
  ) {}

  public async handleRequest(req: Request, res: Response) {
    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: req.params.environmentId,
      })
    );

    const workflows: Workflow[] = [];

    if (Object.values(PostActionEnum).includes(req.query.action as PostActionEnum)) {
      const programmaticallyConstructedWorkflow = await this.createFrameworkWorkflow.execute(
        ConstructFrameworkWorkflowCommand.create({
          environmentId: req.params.environmentId,
          workflowId: req.query.workflowId as string,
          controlValues: req.body.controls,
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
