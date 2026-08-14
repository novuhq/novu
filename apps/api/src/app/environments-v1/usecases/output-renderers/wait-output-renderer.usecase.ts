import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { WaitOutput } from '@novu/framework/internal';
import { RenderCommand } from './render-command';

@Injectable()
export class WaitOutputRendererUsecase {
  @InstrumentUsecase()
  execute(renderCommand: RenderCommand): WaitOutput {
    const { skip, ...outputControls } = renderCommand.controlValues ?? {};

    return outputControls as any;
  }
}
