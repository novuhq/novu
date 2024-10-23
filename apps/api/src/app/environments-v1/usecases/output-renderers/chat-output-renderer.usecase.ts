// Concrete Renderer for Chat Preview
import { ChatRenderOutput } from '@novu/shared';
import { Injectable } from '@nestjs/common';
import { RenderCommand } from './render-command';

@Injectable()
export class ChatOutputRendererUsecase {
  execute(renderCommand: RenderCommand): ChatRenderOutput {
    const body = renderCommand.controlValues.body as string;

    return { body };
  }
}
