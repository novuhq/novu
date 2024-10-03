// Concrete Renderer for SMS Preview
import { SmsRenderOutput } from '@novu/shared';
import { Injectable } from '@nestjs/common';
import { RenderCommand } from './render-command';

@Injectable()
export class SmsOutputRendererUsecase {
  execute(renderCommand: RenderCommand): SmsRenderOutput {
    const body = renderCommand.controlValues.body as string;

    return { body };
  }
}
