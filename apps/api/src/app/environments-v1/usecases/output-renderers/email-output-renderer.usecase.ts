import { JSONContent as MailyJSONContent, render as mailyRender } from '@maily-to/render';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  EmailControlType,
  FeatureFlagsService,
  InstrumentUsecase,
  LayoutControlType,
  PinoLogger,
  sanitizeHTML,
} from '@novu/application-generic';
import { ControlValuesEntity, ControlValuesRepository, JobEntity, JobRepository } from '@novu/dal';
import { createLiquidEngine } from '@novu/framework/internal';
import {
  ControlValuesLevelEnum,
  EmailRenderOutput,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FeatureFlagsKeysEnum,
  LAYOUT_CONTENT_VARIABLE,
} from '@novu/shared';
import { Liquid } from 'liquidjs';
import { GetLayoutCommand, GetLayoutUseCase } from '../../../layouts-v2/usecases/get-layout';
import { GetOrganizationSettingsCommand } from '../../../organization/usecases/get-organization-settings/get-organization-settings.command';
import { GetOrganizationSettings } from '../../../organization/usecases/get-organization-settings/get-organization-settings.usecase';
import { MailyAttrsEnum } from '../../../shared/helpers/maily.types';
import {
  hasShow,
  isButtonNode,
  isImageNode,
  isLinkNode,
  isRepeatNode,
  isVariableNode,
  replaceMailyNodesByCondition,
  wrapMailyInLiquid,
} from '../../../shared/helpers/maily-utils';
import { removeBrandingFromHtml } from '../../../shared/utils/html';
import { BaseTranslationRendererUsecase } from './base-translation-renderer.usecase';
import { NOVU_BRANDING_HTML } from './novu-branding-html';
import { FullPayloadForRender, RenderCommand } from './render-command';

type MailyJSONMarks = NonNullable<MailyJSONContent['marks']>[number];

export class EmailOutputRendererCommand extends RenderCommand {
  environmentId: string;
  organizationId: string;
  workflowId?: string;
  locale?: string;
  skipLayoutRendering?: boolean;
  jobId?: string;
  stepId: string;
}

function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }

  return true;
}

@Injectable()
export class EmailOutputRendererUsecase extends BaseTranslationRendererUsecase {
  private readonly liquidEngine: Liquid;

  constructor(
    private getOrganizationSettings: GetOrganizationSettings,
    protected moduleRef: ModuleRef,
    protected logger: PinoLogger,
    protected featureFlagsService: FeatureFlagsService,
    private controlValuesRepository: ControlValuesRepository,
    private getLayoutUseCase: GetLayoutUseCase,
    private jobRepository: JobRepository,
    private createExecutionDetails: CreateExecutionDetails
  ) {
    super(moduleRef, logger, featureFlagsService);
    this.liquidEngine = createLiquidEngine();
  }

  @InstrumentUsecase()
  async execute(renderCommand: EmailOutputRendererCommand): Promise<EmailRenderOutput> {
    const {
      body,
      subject: controlSubject,
      disableOutputSanitization,
      layoutId,
    } = renderCommand.controlValues as EmailControlType;

    if (!body || typeof body !== 'string') {
      /**
       * Force type mapping in case undefined control.
       * This passes responsibility to framework to throw type validation exceptions
       * rather than handling invalid types here.
       */

      return {
        subject: controlSubject as string,
        body: body as string,
      };
    }

    const {
      fullPayloadForRender,
      environmentId,
      organizationId,
      workflowId,
      locale,
      skipLayoutRendering,
      jobId,
      stepId,
    } = renderCommand;

    // Step 1: Apply translations to subject (already liquid-interpolated)
    const translatedSubject = await this.processSubjectTranslations(
      controlSubject as string,
      fullPayloadForRender,
      environmentId,
      organizationId,
      workflowId,
      locale
    );

    // Step 2: Process body content (with translations applied before rendering)
    const renderedHtml = await this.renderWithLayout({
      body,
      layoutId,
      payload: fullPayloadForRender,
      environmentId,
      organizationId,
      workflowId,
      locale,
      skipLayoutRendering,
      jobId,
      stepId,
    });

    // Step 3: Add Novu branding
    const htmlWithBranding = await this.appendNovuBranding(renderedHtml, organizationId);
    const cleanedHtml = this.cleanupRenderedHtml(htmlWithBranding);

    // Step 4: Sanitize output if needed
    if (disableOutputSanitization) {
      return { subject: translatedSubject, body: cleanedHtml };
    }

    const sanitizedSubject = sanitizeHTML(translatedSubject);
    const sanitizedBody = sanitizeHTML(cleanedHtml);

    return {
      subject: sanitizedSubject,
      body: sanitizedBody,
    };
  }

  private async getOverrideLayoutId({
    job,
    stepId,
  }: {
    job: JobEntity;
    stepId: string;
  }): Promise<string | null | undefined> {
    const { overrides, step } = job;
    let layoutIdentifier: string | null | undefined;

    // Step 1: Check step-level override (highest priority)
    const id = overrides?.steps?.[step._id ?? ''] ? step._id : stepId;
    const stepOverrides = overrides?.steps?.[id ?? ''];
    if (stepOverrides?.layoutId !== undefined) {
      layoutIdentifier = stepOverrides.layoutId;
    }
    // Step 2: Check channel-level override for email
    else if (overrides?.channels?.email?.layoutId !== undefined) {
      layoutIdentifier = overrides.channels.email.layoutId;
    }
    // Step 3: Check deprecated layoutIdentifier (backward compatibility)
    else if (overrides?.layoutIdentifier) {
      layoutIdentifier = overrides.layoutIdentifier;
    }

    // If no override is specified, return undefined (use step configuration)
    if (layoutIdentifier === undefined) {
      return undefined;
    }

    // If explicitly set to null, return null (no layout)
    if (layoutIdentifier === null) {
      return null;
    }

    return layoutIdentifier;
  }

  private async renderWithLayout({
    body,
    layoutId: controlValueLayoutId,
    payload,
    environmentId,
    organizationId,
    workflowId,
    locale,
    skipLayoutRendering,
    jobId,
    stepId,
  }: {
    body: string;
    layoutId?: string | null;
    payload: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    workflowId?: string;
    locale?: string;
    skipLayoutRendering?: boolean;
    jobId?: string;
    stepId: string;
  }): Promise<string> {
    let job: JobEntity | null = null;
    let overrideLayoutId: string | null | undefined;
    if (jobId) {
      job = await this.jobRepository.findOne({
        _id: jobId,
        _environmentId: environmentId,
      });
      if (job) {
        overrideLayoutId = await this.getOverrideLayoutId({ job, stepId });
      }
    }

    const layoutId = overrideLayoutId || (overrideLayoutId === null ? null : controlValueLayoutId);

    let layoutControlsEntity: ControlValuesEntity | null = null;
    // if the step control values have a layoutId then find layout controls entity
    if (layoutId) {
      try {
        const layout = await this.getLayoutUseCase.execute(
          GetLayoutCommand.create({
            layoutIdOrInternalId: layoutId,
            environmentId,
            organizationId,
            skipAdditionalFields: true,
          })
        );
        layoutControlsEntity = await this.controlValuesRepository.findOne({
          _organizationId: organizationId,
          _environmentId: environmentId,
          _layoutId: layout._id,
          level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
        });
        if (job) {
          this.createExecutionDetails
            .execute(
              CreateExecutionDetailsCommand.create({
                ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
                detail: DetailEnum.LAYOUT_SELECTED,
                source: ExecutionDetailsSourceEnum.INTERNAL,
                status: ExecutionDetailsStatusEnum.PENDING,
                isTest: false,
                isRetry: false,
                raw: JSON.stringify({ name: layout.name, layoutId: layout.layoutId }),
              })
            )
            .catch((promiseError) => {
              this.logger.error({ error: promiseError }, 'Failed to create execution details');
            });
        }
      } catch (error) {
        if (job) {
          this.createExecutionDetails
            .execute(
              CreateExecutionDetailsCommand.create({
                ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
                detail: DetailEnum.LAYOUT_NOT_FOUND,
                source: ExecutionDetailsSourceEnum.INTERNAL,
                status: ExecutionDetailsStatusEnum.FAILED,
                isTest: false,
                isRetry: false,
                raw: JSON.stringify({
                  layoutId,
                  error: error.message,
                }),
              })
            )
            .catch((promiseError) => {
              this.logger.error({ error: promiseError }, 'Failed to create execution details');
            });
        }
        throw error;
      }
    }

    const stepBodyHtml = await this.processBodyContent({
      body,
      payload,
      environmentId,
      organizationId,
      workflowId,
      locale,
      noHtmlWrappingTags: !!layoutControlsEntity,
    });

    const cleanedStepBodyHtml = stepBodyHtml
      .replace(/<!DOCTYPE.*?>/g, '')
      .replace(/<!--\$-->/g, '')
      .replace(/<!--\/\$-->/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    if (!layoutControlsEntity || skipLayoutRendering) {
      return cleanedStepBodyHtml;
    }

    const layoutControlValues = layoutControlsEntity.controls as LayoutControlType;

    return this.processBodyContent({
      body: layoutControlValues.email?.body ?? '',
      payload: {
        ...payload,
        [LAYOUT_CONTENT_VARIABLE]: removeBrandingFromHtml(cleanedStepBodyHtml.replace(/\n/g, '')),
      },
      environmentId,
      organizationId,
      workflowId,
      locale,
    });
  }

  private enhanceContentVariable(body: string) {
    return JSON.stringify(
      replaceMailyNodesByCondition(
        body,
        (node) => node.type === 'variable' && node.attrs?.id === LAYOUT_CONTENT_VARIABLE,
        (node) =>
          ({
            ...node,
            attrs: {
              ...node.attrs,
              shouldDangerouslySetInnerHTML: true,
            },
          }) satisfies MailyJSONContent
      )
    );
  }

  private async processBodyContent({
    body,
    payload,
    environmentId,
    organizationId,
    workflowId,
    locale,
    noHtmlWrappingTags,
  }: {
    body: string;
    payload: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    workflowId?: string;
    locale?: string;
    noHtmlWrappingTags?: boolean;
  }): Promise<string> {
    if (typeof body === 'object' || (typeof body === 'string' && isJsonString(body))) {
      const escapedPayloadForJson = this.deepEscapePayloadStrings(payload);
      const liquifiedMaily = wrapMailyInLiquid(this.enhanceContentVariable(body));
      const transformedMaily = await this.transformMailyContent(liquifiedMaily, escapedPayloadForJson);
      const translatedMaily = await this.processMailyTranslations({
        mailyContent: transformedMaily,
        variables: escapedPayloadForJson,
        environmentId,
        organizationId,
        workflowId,
        locale,
      });
      const parsedMaily = await this.parseMailyContentByLiquid(translatedMaily, escapedPayloadForJson);

      return await mailyRender(parsedMaily, { noHtmlWrappingTags });
    } else {
      // For simple text body, apply translations directly
      const processedHtml = await this.processTextTranslations({
        text: body,
        variables: payload,
        environmentId,
        organizationId,
        workflowId,
        locale,
      });

      return processedHtml;
    }
  }

  private async processSubjectTranslations(
    subject: string,
    variables: FullPayloadForRender,
    environmentId: string,
    organizationId: string,
    workflowId?: string,
    locale?: string
  ): Promise<string> {
    return this.processStringTranslations({
      content: subject,
      variables,
      environmentId,
      organizationId,
      workflowId,
      locale,
    });
  }

  private async processMailyTranslations({
    mailyContent,
    variables,
    environmentId,
    organizationId,
    workflowId,
    locale,
  }: {
    mailyContent: MailyJSONContent;
    variables: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    workflowId?: string;
    locale?: string;
  }): Promise<MailyJSONContent> {
    try {
      const contentString = JSON.stringify(mailyContent);
      const translatedContent = await this.processStringTranslations({
        content: contentString,
        variables,
        environmentId,
        organizationId,
        workflowId,
        locale,
      });

      return JSON.parse(translatedContent);
    } catch (error) {
      this.logger.error('Maily translation processing failed, falling back to original content', error);

      return mailyContent;
    }
  }

  private async processTextTranslations({
    text,
    variables,
    environmentId,
    organizationId,
    workflowId,
    locale,
  }: {
    text: string;
    variables: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    workflowId?: string;
    locale?: string;
  }): Promise<string> {
    try {
      const translatedText = await this.processStringTranslations({
        content: text,
        variables,
        environmentId,
        organizationId,
        workflowId,
        locale,
      });

      return await this.liquidEngine.parseAndRender(translatedText, variables);
    } catch (error) {
      this.logger.error('Text translation processing failed, falling back to liquid processing', error);

      return await this.liquidEngine.parseAndRender(text, variables);
    }
  }

  private async parseMailyContentByLiquid(
    mailyContent: MailyJSONContent,
    variables: FullPayloadForRender
  ): Promise<MailyJSONContent> {
    const parsedString = await this.liquidEngine.parseAndRender(JSON.stringify(mailyContent), variables);

    return JSON.parse(parsedString);
  }

  private async transformMailyContent(
    node: MailyJSONContent,
    variables: FullPayloadForRender,
    parent?: MailyJSONContent
  ) {
    const queue: Array<{ node: MailyJSONContent; parent?: MailyJSONContent }> = [{ node, parent }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (hasShow(current.node)) {
        const shouldShow = await this.handleShowNode(current.node, variables, current.parent);

        if (!shouldShow) {
          continue;
        }
      }

      if (isRepeatNode(current.node)) {
        await this.handleEachNode(current.node, variables, current.parent);
      }

      if (isVariableNode(current.node)) {
        this.processVariableNodeTypes(current.node);
      }

      if (current.node.content) {
        for (const childNode of current.node.content) {
          queue.push({ node: childNode, parent: current.node });
        }
      }
    }

    return node;
  }

  private async handleShowNode(
    node: MailyJSONContent & { attrs: { [MailyAttrsEnum.SHOW_IF_KEY]: string } },
    variables: FullPayloadForRender,
    parent?: MailyJSONContent
  ): Promise<boolean> {
    const shouldShow = await this.evaluateShowCondition(variables, node);
    if (!shouldShow && parent?.content) {
      parent.content = parent.content.filter((pNode) => pNode !== node);
    }

    delete (node.attrs as Record<string, string>)[MailyAttrsEnum.SHOW_IF_KEY];

    return shouldShow;
  }

  private async handleEachNode(
    node: MailyJSONContent & { attrs: { [MailyAttrsEnum.EACH_KEY]: string } },
    variables: FullPayloadForRender,
    parent?: MailyJSONContent
  ): Promise<void> {
    const newContent = await this.multiplyForEachNode(node, variables);

    if (parent?.content) {
      const nodeIndex = parent.content.indexOf(node);
      parent.content = [...parent.content.slice(0, nodeIndex), ...newContent, ...parent.content.slice(nodeIndex + 1)];
    } else {
      node.content = newContent;
    }
  }

  private async evaluateShowCondition(
    variables: FullPayloadForRender,
    node: MailyJSONContent & { attrs: { [MailyAttrsEnum.SHOW_IF_KEY]: string } }
  ): Promise<boolean> {
    const { [MailyAttrsEnum.SHOW_IF_KEY]: showIfKey } = node.attrs;
    const parsedShowIfValue = await this.liquidEngine.parseAndRender(showIfKey, variables);

    return this.stringToBoolean(parsedShowIfValue);
  }

  private processVariableNodeTypes(node: MailyJSONContent) {
    node.type = 'text'; // set 'variable' to 'text' to for Liquid to recognize it
    node.text = node.attrs?.id || '';
  }

  /**
   * For 'each' node, multiply the content by the number of items in the iterable array
   * and add indexes to the placeholders. If iterations attribute is set, limits the number
   * of iterations to that value, otherwise renders all items.
   *
   * @example
   * node:
   * {
   *   type: 'each',
   *   attrs: {
   *     each: '{{ payload.comments }}',
   *     iterations: 2 // Optional - limits to first 2 items only
   *   },
   *   content: [
   *     { type: 'variable', text: '{{ payload.comments.author }}' }
   *   ]
   * }
   *
   * variables:
   * { payload: { comments: [{ author: 'John Doe' }, { author: 'Jane Doe' }] } }
   *
   * result:
   * [
   *   { type: 'text', text: '{{ payload.comments[0].author }}' },
   *   { type: 'text', text: '{{ payload.comments[1].author }}' }
   * ]
   *
   */
  private async multiplyForEachNode(
    node: MailyJSONContent & { attrs: { [MailyAttrsEnum.EACH_KEY]: string } },
    variables: FullPayloadForRender
  ): Promise<MailyJSONContent[]> {
    const iterablePath = node.attrs[MailyAttrsEnum.EACH_KEY];
    const iterations = node.attrs[MailyAttrsEnum.ITERATIONS_KEY];
    const forEachNodes = node.content || [];
    const iterableArray = await this.getIterableArray(iterablePath, variables);
    const limitedIterableArray = iterations ? iterableArray.slice(0, iterations) : iterableArray;

    return limitedIterableArray.flatMap((_, index) => this.processForEachNodes(forEachNodes, iterablePath, index));
  }

  private async getIterableArray(iterablePath: string, variables: FullPayloadForRender): Promise<unknown[]> {
    const iterableArrayString = await this.liquidEngine.parseAndRender(iterablePath, variables);

    try {
      const parsedArray = JSON.parse(iterableArrayString.replace(/'/g, '"'));

      if (!Array.isArray(parsedArray)) {
        throw new Error(`Iterable "${iterablePath}" is not an array`);
      }

      return parsedArray;
    } catch (error) {
      throw new Error(`Failed to parse iterable value for "${iterablePath}": ${error.message}`);
    }
  }

  private processForEachNodes(
    nodes: MailyJSONContent[],
    iterablePath: string,
    index: number
  ): Array<MailyJSONContent | MailyJSONMarks> {
    return nodes.map((node) => {
      const processedNode = { ...node };

      if (isVariableNode(processedNode)) {
        this.processVariableNodeTypes(processedNode);
        if (processedNode.text) {
          processedNode.text = this.addIndexToLiquidExpression(processedNode.text, iterablePath, index);
        }

        return processedNode;
      }

      if (isButtonNode(processedNode)) {
        if (processedNode.attrs?.text) {
          processedNode.attrs.text = this.addIndexToLiquidExpression(processedNode.attrs.text, iterablePath, index);
        }

        if (processedNode.attrs?.url) {
          processedNode.attrs.url = this.addIndexToLiquidExpression(processedNode.attrs.url, iterablePath, index);
        }

        return processedNode;
      }

      if (isImageNode(processedNode)) {
        if (processedNode.attrs?.src) {
          processedNode.attrs.src = this.addIndexToLiquidExpression(processedNode.attrs.src, iterablePath, index);
        }

        if (processedNode.attrs?.externalLink) {
          processedNode.attrs.externalLink = this.addIndexToLiquidExpression(
            processedNode.attrs.externalLink,
            iterablePath,
            index
          );
        }

        return processedNode;
      }

      if (isLinkNode(processedNode)) {
        if (processedNode.attrs?.href) {
          processedNode.attrs.href = this.addIndexToLiquidExpression(processedNode.attrs.href, iterablePath, index);
        }

        return processedNode;
      }

      if (processedNode.content?.length) {
        processedNode.content = this.processForEachNodes(processedNode.content, iterablePath, index);
      }

      if (processedNode.marks?.length) {
        processedNode.marks = this.processForEachNodes(
          processedNode.marks,
          iterablePath,
          index
        ) as Array<MailyJSONMarks>;
      }

      return processedNode;
    });
  }

  /**
   * Add the index to the liquid expression if it doesn't already have an array index
   *
   * @example
   * text: '{{ payload.comments.author }}'
   * iterablePath: '{{ payload.comments }}'
   * index: 0
   * result: '{{ payload.comments[0].author }}'
   */
  private addIndexToLiquidExpression(text: string, iterablePath: string, index: number): string {
    const cleanPath = iterablePath.replace(/\{\{|\}\}/g, '').trim();
    const liquidMatch = text.match(/\{\{\s*(.*?)\s*\}\}/);

    if (!liquidMatch) return text;

    const [path, ...filters] = liquidMatch[1].split('|').map((part) => part.trim());
    if (path.includes('[')) return text;

    const newPath = path.replace(cleanPath, `${cleanPath}[${index}]`);

    return filters.length ? `{{ ${newPath} | ${filters.join(' | ')} }}` : `{{ ${newPath} }}`;
  }

  private stringToBoolean(value: string): boolean {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'false' || normalized === 'null' || normalized === 'undefined') return false;

    try {
      return Boolean(JSON.parse(normalized));
    } catch {
      return Boolean(normalized);
    }
  }

  private async appendNovuBranding(html: string, organizationId: string): Promise<string> {
    try {
      const { removeNovuBranding } = await this.getOrganizationSettings.execute(
        GetOrganizationSettingsCommand.create({
          organizationId,
        })
      );

      if (removeNovuBranding) {
        return html;
      }

      return this.insertBrandingHtml(html);
    } catch (error) {
      // If there's any error fetching organization, return original HTML to avoid breaking emails
      return html;
    }
  }

  private insertBrandingHtml(html: string): string {
    const matches = [...html.matchAll(/<\/body>/gi)];

    if (matches.length === 0) {
      if (html?.trim()) {
        return html + NOVU_BRANDING_HTML;
      } else {
        return html;
      }
    }

    const lastIndex = matches[matches.length - 1].index!;

    return html.slice(0, lastIndex) + NOVU_BRANDING_HTML + html.slice(lastIndex);
  }

  private deepEscapePayloadStrings(payload: FullPayloadForRender): FullPayloadForRender {
    return this.deepEscapeObject(payload) as FullPayloadForRender;
  }

  private deepEscapeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.escapeStringForJson(obj);
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

  private escapeStringForJson(str: string): string {
    return str
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/"/g, '\\"') // Escape quotes
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs
  }

  private cleanupRenderedHtml(html: string): string {
    /*
     * Convert paragraphs that contain only whitespace characters to empty paragraphs to prevent Gmail clipping.
     * Gmail's clipping algorithm detects trailing whitespace content and marks emails as "message clipped".
     * This preserves the intended spacing while removing the problematic whitespace content.
     */
    return html.replace(/<p([^>]*)>\s+<\/p>/g, '<p$1></p>');
  }
}
