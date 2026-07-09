import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  chatCardToMarkdownFallback,
  compileMailyToChatCard,
  InstrumentUsecase,
  isStringifiedMailyJSONContent,
  PinoLogger,
  transformMailyContent,
  wrapMailyInLiquid,
} from '@novu/application-generic';
import { LocalizationResourceEnum, NotificationTemplateEntity } from '@novu/dal';
import { createLiquidEngine } from '@novu/framework/internal';
import { JSONContent as MailyJSONContent } from '@novu/maily-render';
import { ChatRenderOutput } from '@novu/shared';
import { Liquid } from 'liquidjs';
import { BaseTranslationRendererUsecase } from './base-translation-renderer.usecase';
import { FullPayloadForRender, RenderCommand } from './render-command';

export class ChatOutputRendererCommand extends RenderCommand {
  dbWorkflow: NotificationTemplateEntity;
  locale?: string;
}

@Injectable()
export class ChatOutputRendererUsecase extends BaseTranslationRendererUsecase {
  private readonly liquidEngine: Liquid;

  constructor(
    protected moduleRef: ModuleRef,
    protected logger: PinoLogger
  ) {
    super(moduleRef, logger);
    /**
     * Same custom outputEscape as the email renderer: serializes objects/arrays for
     * Maily repeat loops while leaving string output unescaped, so liquid values
     * interpolated into the stringified doc JSON keep their content intact.
     */
    this.liquidEngine = createLiquidEngine({
      outputEscape: (output: unknown): string => {
        if (Array.isArray(output) || (typeof output === 'object' && output !== null)) {
          const valueStringified = JSON.stringify(output);
          const valueSingleQuotes = valueStringified.replace(/"/g, "'");
          const valueEscapedNewLines = valueSingleQuotes.replace(/\n/g, '\\n');

          return valueEscapedNewLines;
        }

        return output === undefined || output === null ? '' : String(output as unknown);
      },
    });
  }

  @InstrumentUsecase()
  async execute(renderCommand: ChatOutputRendererCommand): Promise<ChatRenderOutput> {
    const { skip, editorType, ...outputControls } = renderCommand.controlValues ?? {};
    const { _environmentId, _organizationId, _id: workflowId } = renderCommand.dbWorkflow;

    const translatedControls = await this.processTranslations({
      controls: outputControls,
      variables: renderCommand.fullPayloadForRender,
      environmentId: _environmentId,
      organizationId: _organizationId,
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: renderCommand.locale,
      resourceEntity: renderCommand.dbWorkflow,
      organization: renderCommand.organization,
    });

    const body = translatedControls.body;
    if (!isStringifiedMailyJSONContent(body)) {
      /*
       * Legacy plain-string body: return controls untouched — the framework's generic
       * liquid pass resolves {{ }} variables, exactly as before the block editor existed.
       */
      return translatedControls as any;
    }

    const variables = this.escapePayloadStringsForJson(renderCommand.fullPayloadForRender);
    const liquifiedMaily = wrapMailyInLiquid(body);
    const transformedMaily = await transformMailyContent(liquifiedMaily, variables, this.liquidEngine);
    const parsedMaily = await this.parseMailyContentByLiquid(transformedMaily, variables);
    const card = compileMailyToChatCard(parsedMaily);

    return { body: chatCardToMarkdownFallback(card), card };
  }

  private async parseMailyContentByLiquid(
    mailyContent: MailyJSONContent,
    variables: FullPayloadForRender
  ): Promise<MailyJSONContent> {
    const parsedString = await this.liquidEngine.parseAndRender(JSON.stringify(mailyContent), variables);

    try {
      return JSON.parse(parsedString);
    } catch (error) {
      throw new InternalServerErrorException(
        `Liquid-rendered chat content is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Escapes string values in the render payload so liquid interpolation into the
   * stringified doc JSON cannot produce invalid JSON (mirrors the email renderer's
   * deepEscapePayloadStrings; JSON.parse restores the original characters).
   */
  private escapePayloadStringsForJson(payload: FullPayloadForRender): FullPayloadForRender {
    return this.deepEscapeObject(payload) as FullPayloadForRender;
  }

  private deepEscapeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return obj
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepEscapeObject(item));
    }

    if (typeof obj === 'object') {
      const escapedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        escapedObj[key] = this.deepEscapeObject(value);
      }

      return escapedObj;
    }

    return obj;
  }
}
