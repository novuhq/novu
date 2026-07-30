import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  compileMailyToCard,
  FeatureFlagsService,
  InstrumentUsecase,
  isStringifiedMailyJSONContent,
  PinoLogger,
  transformMailyContent,
  wrapMailyInLiquid,
} from '@novu/application-generic';
import { LocalizationResourceEnum, NotificationTemplateEntity, OrganizationEntity } from '@novu/dal';
import { createLiquidEngine } from '@novu/framework/internal';
import { JSONContent as MailyJSONContent } from '@novu/maily-render';
import { ChatRenderOutput, FeatureFlagsKeysEnum } from '@novu/shared';
import { Liquid } from 'liquidjs';
import { BaseTranslationRendererUsecase, TranslationContext } from './base-translation-renderer.usecase';
import { ControlsTranslationService } from './controls-translation.service';
import { FullPayloadForRender, RenderCommand } from './render-command';

export class ChatOutputRendererCommand extends RenderCommand {
  dbWorkflow: NotificationTemplateEntity;
  locale?: string;
}

/** Maps already-translated chat controls to the body-only step output. */
@Injectable()
export class ChatOutputRendererUsecase extends BaseTranslationRendererUsecase {
  private readonly liquidEngine: Liquid;

  constructor(
    protected moduleRef: ModuleRef,
    protected logger: PinoLogger,
    private featureFlagsService: FeatureFlagsService,
    controlsTranslationService: ControlsTranslationService
  ) {
    super(logger, controlsTranslationService);
    /*
     * The card body is a Maily document rendered into a stringified JSON blob, so the payload
     * strings are pre-escaped once (see `deepEscapePayloadStrings`) and this engine must NOT
     * escape strings again — otherwise values would be double-escaped. Objects/arrays are still
     * serialized (single quotes + escaped newlines) so Maily loops over payload data keep working.
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
    const { skip, ...outputControls } = renderCommand.controlValues ?? {};
    const {
      _environmentId: environmentId,
      _organizationId: organizationId,
      _id: workflowId,
    } = renderCommand.dbWorkflow;
    const { body } = outputControls as { body?: unknown };

    // Rich Chat: a Maily/TipTap document body compiles to a provider-agnostic `CardElement` when
    // `IS_CHAT_BLOCK_EDITOR_ENABLED` is on; otherwise it degrades to a markdown `body` string.
    const isRichChatEnabled = await this.isRichChatEnabled(environmentId, organizationId);
    if (isRichChatEnabled && isStringifiedMailyJSONContent(body)) {
      const translationContext = await this.createTranslationContext({
        environmentId,
        organizationId,
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: renderCommand.locale,
        organization: renderCommand.organization,
        resourceEntity: renderCommand.dbWorkflow,
      });

      const card = await this.compileCard({
        body,
        variables: renderCommand.fullPayloadForRender,
        environmentId,
        organizationId,
        workflowId,
        locale: renderCommand.locale,
        organization: renderCommand.organization,
        translationContext,
      });

      return { card };
    }

    const translatedControls = await this.processTranslations({
      controls: outputControls,
      variables: renderCommand.fullPayloadForRender,
      environmentId,
      organizationId,
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale: renderCommand.locale,
      resourceEntity: renderCommand.dbWorkflow,
      organization: renderCommand.organization,
    });

    return translatedControls as ChatRenderOutput;
  }

  private async isRichChatEnabled(environmentId: string, organizationId: string): Promise<boolean> {
    return await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CHAT_BLOCK_EDITOR_ENABLED,
      organization: { _id: organizationId },
      environment: { _id: environmentId },
      defaultValue: false,
    });
  }

  private async compileCard({
    body,
    variables,
    environmentId,
    organizationId,
    workflowId,
    locale,
    organization,
    translationContext,
  }: {
    body: string;
    variables: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    workflowId?: string;
    locale?: string;
    organization?: OrganizationEntity;
    translationContext?: TranslationContext | null;
  }): Promise<ChatRenderOutput['card']> {
    // Escape payload strings so values containing quotes, backslashes or newlines survive being
    // liquid-rendered into the stringified Maily JSON and re-parsed in `parseMailyContentByLiquid`.
    const escapedVariables = this.deepEscapePayloadStrings(
      this.deepUnescapeTranslationStrings(variables) as FullPayloadForRender
    );
    // Resolve `showIfKey` conditionals + `each`/repeat loops and normalize variable nodes,
    // mirroring the email renderer so cards support the same authoring features.
    const liquifiedMaily = await transformMailyContent(wrapMailyInLiquid(body), escapedVariables, this.liquidEngine);
    const translatedMaily = await this.processMailyTranslations({
      mailyContent: liquifiedMaily,
      variables: escapedVariables,
      environmentId,
      organizationId,
      resourceId: workflowId,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale,
      organization,
      translationContext,
    });
    const resolvedMaily = await this.parseMailyContentByLiquid(translatedMaily, escapedVariables);

    return compileMailyToCard(resolvedMaily);
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
        `Liquid-rendered chat Maily content is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
