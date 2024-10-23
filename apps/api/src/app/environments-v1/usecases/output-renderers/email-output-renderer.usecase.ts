import { EmailRenderOutput } from '@novu/shared';
import { render } from '@maily-to/render';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { RenderCommand } from './render-command';
import { ExpandEmailEditorSchemaUsecase } from './email-schema-expander.usecase';

@Injectable()
export class EmailOutputRendererUsecase {
  constructor(private expendEmailEditorSchemaUseCase: ExpandEmailEditorSchemaUsecase) {}

  async execute(renderCommand: RenderCommand): Promise<EmailRenderOutput> {
    const parse = EmailStepControlSchema.parse(renderCommand.controlValues);
    const expandedSchema = this.expendEmailEditorSchemaUseCase.execute({ schema: parse.emailEditor });
    const html = await render(expandedSchema);

    return { subject: parse.subject, body: html };
  }
}

export const EmailStepControlSchema = z
  .object({
    emailEditor: z.string(),
    subject: z.string(),
  })
  .strict();
