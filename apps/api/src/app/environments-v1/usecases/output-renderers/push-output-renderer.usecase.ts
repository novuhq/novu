import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { PushRenderOutput } from '@novu/shared';

/** Maps already-translated push controls to the subject/body step output. */
@Injectable()
export class PushOutputRendererUsecase {
  @InstrumentUsecase()
  execute(translatedControls: Record<string, unknown>): PushRenderOutput {
    return {
      subject: (translatedControls.subject as string) ?? '',
      body: (translatedControls.body as string) ?? '',
    };
  }
}
