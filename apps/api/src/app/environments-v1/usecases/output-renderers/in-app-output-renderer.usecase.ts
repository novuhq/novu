import { InAppRenderOutput } from '@novu/shared';
import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, sanitizeHtmlInObject } from '@novu/application-generic';
import { RenderCommand } from './render-command';

@Injectable()
export class InAppOutputRendererUsecase {
  @InstrumentUsecase()
  execute(renderCommand: RenderCommand): InAppRenderOutput {
    const { skip, disableOutputSanitization, ...outputControls } = renderCommand.controlValues ?? {};

    if (disableOutputSanitization) {
      return outputControls as any;
    }

    const { data, ...restOutputControls } = outputControls;

    return {
      ...sanitizeHtmlInObject(restOutputControls),
      ...(data ? { data } : {}),
    } as any;
  }
}
