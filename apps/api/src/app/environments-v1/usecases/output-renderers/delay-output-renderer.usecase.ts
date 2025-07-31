import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { DelayRenderOutput } from '@novu/shared';
import { RenderCommand } from './render-command';

@Injectable()
export class DelayOutputRendererUsecase {
  @InstrumentUsecase()
  execute(renderCommand: RenderCommand): DelayRenderOutput {
    const { skip, ...outputControls } = renderCommand.controlValues ?? {};

    return outputControls as any;
  }
}
