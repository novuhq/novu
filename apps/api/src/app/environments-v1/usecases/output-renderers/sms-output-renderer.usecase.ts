import { Injectable } from '@nestjs/common';
import { SmsRenderOutput } from '@novu/shared';
import { InstrumentUsecase } from '@novu/application-generic';
import { RenderCommand } from './render-command';

@Injectable()
export class SmsOutputRendererUsecase {
  @InstrumentUsecase()
  execute(renderCommand: RenderCommand): SmsRenderOutput {
    const { skip, ...outputControls } = renderCommand.controlValues ?? {};

    return outputControls as any;
  }
}
