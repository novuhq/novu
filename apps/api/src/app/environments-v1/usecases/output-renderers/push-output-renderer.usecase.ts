import { Injectable } from '@nestjs/common';
import { PushRenderOutput } from '@novu/shared';
import { InstrumentUsecase } from '@novu/application-generic';
import { RenderCommand } from './render-command';

@Injectable()
export class PushOutputRendererUsecase {
  @InstrumentUsecase()
  execute(renderCommand: RenderCommand): PushRenderOutput {
    const { skip, ...outputControls } = renderCommand.controlValues ?? {};

    return outputControls as any;
  }
}
