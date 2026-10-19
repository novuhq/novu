import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ThrottleRenderOutput } from '@novu/shared';
import { RenderCommand } from './render-command';

@Injectable()
export class ThrottleOutputRendererUsecase {
  @InstrumentUsecase()
  execute(renderCommand: RenderCommand): ThrottleRenderOutput {
    const { skip: _skip, ...outputControls } = renderCommand.controlValues ?? {};

    return {
      type: outputControls.type,
      amount: outputControls.amount,
      unit: outputControls.unit,
      dynamicKey: outputControls.dynamicKey,
      threshold: outputControls.threshold,
      throttleKey: outputControls.throttleKey,
    } as ThrottleRenderOutput;
  }
}
