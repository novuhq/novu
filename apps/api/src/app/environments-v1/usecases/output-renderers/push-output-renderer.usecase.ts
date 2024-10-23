import { PushRenderOutput } from '@novu/shared';
import { Injectable } from '@nestjs/common';
import { RenderCommand } from './render-command';

@Injectable()
export class PushOutputRendererUsecase {
  execute(renderCommand: RenderCommand): PushRenderOutput {
    const subject = renderCommand.controlValues.subject as string;
    const body = renderCommand.controlValues.body as string;

    return { subject, body };
  }
}
