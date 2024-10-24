import { EmailRenderOutput, TipTapNode } from '@novu/shared';
import { render } from '@maily-to/render';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { RenderCommand } from './render-command';
import { ExpandEmailEditorSchemaUsecase } from './email-schema-expander.usecase';

@Injectable()
export class EmailOutputRendererUsecase {
  constructor(private expendEmailEditorSchemaUseCase: ExpandEmailEditorSchemaUsecase) {}

  async execute(renderCommand: RenderCommand): Promise<EmailRenderOutput> {
    console.log('renderCommand', JSON.stringify(renderCommand, null, 2));

    const parse = EmailStepControlSchema.parse(renderCommand.controlValues);
    console.log('renderCommandParsed', JSON.stringify(parse, null, 2));
    const schema = parse.emailEditor as TipTapNode;
    console.log('schema', JSON.stringify(schema, null, 2));
    const expandedSchema = this.expendEmailEditorSchemaUseCase.execute({ schema });
    console.log('expandedSchema', JSON.stringify(expandedSchema, null, 2));

    const html = await render(expandedSchema);

    return { subject: parse.subject, body: html };
  }
}
const emailContentSchema = z
  .object({
    type: z.string(),
    content: z.array(z.lazy(() => emailContentSchema)).optional(),
    text: z.string().optional(),
    attr: z.record(z.unknown()).optional(),
  })
  .strict();

const emailEditorSchema = z
  .object({
    type: z.string(),
    content: z.array(emailContentSchema).optional(),
    text: z.string().optional(),
    attr: z.record(z.unknown()).optional(),
  })
  .strict();

export const EmailStepControlSchema = z
  .object({
    emailEditor: emailEditorSchema,
    subject: z.string(),
  })
  .strict();
