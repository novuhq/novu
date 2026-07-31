import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ChatRenderOutput } from '@novu/shared';

/** Maps already-translated chat controls to the body-only step output. */
@Injectable()
export class ChatOutputRendererUsecase {
  @InstrumentUsecase()
  execute(translatedControls: Record<string, unknown>): ChatRenderOutput {
    return {
      body: (translatedControls.body as string) ?? '',
    };
  }
}
