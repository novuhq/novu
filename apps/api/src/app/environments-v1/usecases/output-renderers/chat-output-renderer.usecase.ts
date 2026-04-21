import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  type CardElementLike,
  ChatContentCompiler,
  InstrumentUsecase,
  PinoLogger,
  renderCardElementWithLiquid,
} from '@novu/application-generic';
import { LocalizationResourceEnum, NotificationTemplateEntity } from '@novu/dal';
import { createLiquidEngine } from '@novu/framework/internal';
import { ChatCompiledPreviews, ChatRenderOutput } from '@novu/shared';
import { BaseTranslationRendererUsecase } from './base-translation-renderer.usecase';
import { RenderCommand } from './render-command';

export class ChatOutputRendererCommand extends RenderCommand {
  dbWorkflow: NotificationTemplateEntity;
  locale?: string;
}

@Injectable()
export class ChatOutputRendererUsecase extends BaseTranslationRendererUsecase {
  constructor(
    protected moduleRef: ModuleRef,
    protected logger: PinoLogger,
    private chatContentCompiler: ChatContentCompiler
  ) {
    super(moduleRef, logger);
  }

  /**
   * Note: return type is intentionally cast via `any` at the call site
   * boundary (`construct-framework-workflow.usecase.ts`) because
   * `ChatRenderOutput.card` is typed as `Record<string, unknown>` while
   * the framework's `ChatOutputUnvalidated` requires the strict inferred
   * shape from `chatChannelSchemas`. The runtime payload is identical —
   * see e2e coverage in `card-liquid.utils.spec.ts` for the round-trip.
   */
  @InstrumentUsecase()
  async execute(renderCommand: ChatOutputRendererCommand): Promise<ChatRenderOutput> {
    const { skip, ...outputControls } = renderCommand.controlValues ?? {};
    const { _environmentId, _organizationId, _id: workflowId } = renderCommand.dbWorkflow;

    /*
     * Translation runs over the whole controls object (including `card`
     * string leaves) using the existing JSON-roundtrip strategy. Anything
     * unchanged by the translator is preserved byte-for-byte.
     */
    const translatedControls = (await this.processTranslations({
      controls: outputControls,
      variables: renderCommand.fullPayloadForRender,
      environmentId: _environmentId,
      organizationId: _organizationId,
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: renderCommand.locale,
      resourceEntity: renderCommand.dbWorkflow,
      organization: renderCommand.organization,
    })) as { body?: string; card?: CardElementLike; disableFallback?: boolean } & Record<string, unknown>;

    const body = typeof translatedControls.body === 'string' ? translatedControls.body : '';
    const rawCard = translatedControls.card;

    // Legacy text-only path — match pre-rich-content behaviour exactly.
    if (!rawCard || typeof rawCard !== 'object') {
      return { ...translatedControls, body } as ChatRenderOutput;
    }

    /*
     * Render Liquid on every user-facing string leaf of the card tree
     * (title, text content, button labels, URLs, etc.) using the same
     * engine the email path uses.
     */
    const liquidEngine = createLiquidEngine();
    const renderedCard = await renderCardElementWithLiquid(
      rawCard as CardElementLike,
      renderCommand.fullPayloadForRender as unknown as Record<string, unknown>,
      liquidEngine
    );

    /*
     * Compile once, cache multi-platform previews on the response so the
     * dashboard Preview tab doesn't need to repeat the work. Failures are
     * logged and silently degrade to a plain-text preview.
     */
    let compiledPreviews: ChatCompiledPreviews | undefined;
    try {
      const compiled = await this.chatContentCompiler.compileAll(renderedCard);
      compiledPreviews = {
        text: compiled.text,
        slack: compiled.slackBlocks,
        teams: compiled.adaptiveCard,
        discord: compiled.discordEmbeds,
      };
    } catch (err) {
      this.logger.error({ err, workflowId }, 'Chat card compile failed during preview render');
    }

    return {
      body,
      card: renderedCard as Record<string, unknown>,
      compiledPreviews,
    } satisfies ChatRenderOutput;
  }
}
