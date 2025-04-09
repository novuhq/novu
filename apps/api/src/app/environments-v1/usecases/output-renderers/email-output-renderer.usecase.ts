/* eslint-disable no-param-reassign */
import { render as mailyRender, JSONContent as MailyJSONContent } from '@maily-to/render';
import { Injectable } from '@nestjs/common';
import { EmailRenderOutput, FeatureFlagsKeysEnum } from '@novu/shared';
import { FeatureFlagsService, InstrumentUsecase, sanitizeHTML } from '@novu/application-generic';
import { EnvironmentEntity } from '@novu/dal';

import { FullPayloadForRender, RenderCommand } from './render-command';
import { WrapMailyInLiquidUseCase } from './maily-to-liquid/wrap-maily-in-liquid.usecase';
import { MailyAttrsEnum } from './maily-to-liquid/maily.types';
import { parseLiquid } from '../../../shared/helpers/liquid';
import { hasShow, isRepeatNode, isVariableNode } from './maily-to-liquid/maily-utils';

export class EmailOutputRendererCommand extends RenderCommand {
  environmentId: string;
}

@Injectable()
export class EmailOutputRendererUsecase {
  constructor(
    private wrapMailyInLiquidUsecase: WrapMailyInLiquidUseCase,
    private readonly featureFlagService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(renderCommand: EmailOutputRendererCommand): Promise<EmailRenderOutput> {
    const isEnhancedDigestEnabled = await this.featureFlagService.getFlag({
      environment: { _id: renderCommand.environmentId } as EnvironmentEntity,
      key: FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED,
      defaultValue: false,
    });
    const { body, subject: controlSubject, disableOutputSanitization } = renderCommand.controlValues;

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

    const liquifiedMaily = this.wrapMailyInLiquidUsecase.execute({ emailEditor: body });
    const transformedMaily = await this.transformMailyContent(
      liquifiedMaily,
      renderCommand.fullPayloadForRender,
      isEnhancedDigestEnabled
    );
    const parsedMaily = await this.parseMailyContentByLiquid(
      transformedMaily,
      renderCommand.fullPayloadForRender,
      isEnhancedDigestEnabled
    );
    const strippedMaily = this.removeTrailingEmptyLines(parsedMaily);
    const renderedHtml = await mailyRender(strippedMaily);

    /**
     * Force type mapping in case undefined control.
     * This passes responsibility to framework to throw type validation exceptions
     * rather than handling invalid types here.
     */
    const subject = controlSubject as string;

    if (disableOutputSanitization) {
      return { subject, body: renderedHtml };
    }

    return { subject: sanitizeHTML(subject), body: sanitizeHTML(renderedHtml) };
  }

  private removeTrailingEmptyLines(node: MailyJSONContent): MailyJSONContent {
    if (!node.content || node.content.length === 0) return node;

    // Iterate from the end of the content and find the first non-empty node
    let lastIndex = node.content.length;
    // eslint-disable-next-line no-plusplus
    for (let i = node.content.length - 1; i >= 0; i--) {
      const childNode = node.content[i];

      const isEmptyParagraph =
        childNode.type === 'paragraph' && !childNode.text && (!childNode.content || childNode.content.length === 0);

      if (!isEmptyParagraph) {
        lastIndex = i + 1; // Include this node in the result
        break;
      }
    }

    // Slice the content to remove trailing empty nodes
    const filteredContent = node.content.slice(0, lastIndex);

    return { ...node, content: filteredContent };
  }

  private async parseMailyContentByLiquid(
    mailyContent: MailyJSONContent,
    variables: FullPayloadForRender,
    isEnhancedDigestEnabled: boolean
  ): Promise<MailyJSONContent> {
    const parsedString = await parseLiquid(JSON.stringify(mailyContent), variables, isEnhancedDigestEnabled);

    return JSON.parse(parsedString);
  }

  private async transformMailyContent(
    node: MailyJSONContent,
    variables: FullPayloadForRender,
    isEnhancedDigestEnabled: boolean,
    parent?: MailyJSONContent
  ) {
    const queue: Array<{ node: MailyJSONContent; parent?: MailyJSONContent }> = [{ node, parent }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (hasShow(current.node)) {
        const shouldShow = await this.handleShowNode(current.node, variables, isEnhancedDigestEnabled, current.parent);

        if (!shouldShow) {
          continue;
        }
      }

      if (isRepeatNode(current.node)) {
        await this.handleEachNode(current.node, variables, isEnhancedDigestEnabled, current.parent);
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
    isEnhancedDigestEnabled: boolean,
    parent?: MailyJSONContent
  ): Promise<boolean> {
    const shouldShow = await this.evaluateShowCondition(variables, node, isEnhancedDigestEnabled);
    if (!shouldShow && parent?.content) {
      parent.content = parent.content.filter((pNode) => pNode !== node);
    }

    // @ts-ignore
    delete node.attrs[MailyAttrsEnum.SHOW_IF_KEY];

    return shouldShow;
  }

  private async handleEachNode(
    node: MailyJSONContent & { attrs: { [MailyAttrsEnum.EACH_KEY]: string } },
    variables: FullPayloadForRender,
    isEnhancedDigestEnabled: boolean,
    parent?: MailyJSONContent
  ): Promise<void> {
    const newContent = await this.multiplyForEachNode(node, variables, isEnhancedDigestEnabled);

    if (parent?.content) {
      const nodeIndex = parent.content.indexOf(node);
      parent.content = [...parent.content.slice(0, nodeIndex), ...newContent, ...parent.content.slice(nodeIndex + 1)];
    } else {
      node.content = newContent;
    }
  }

  private async evaluateShowCondition(
    variables: FullPayloadForRender,
    node: MailyJSONContent & { attrs: { [MailyAttrsEnum.SHOW_IF_KEY]: string } },
    isEnhancedDigestEnabled: boolean
  ): Promise<boolean> {
    const { [MailyAttrsEnum.SHOW_IF_KEY]: showIfKey } = node.attrs;
    const parsedShowIfValue = await parseLiquid(showIfKey, variables, isEnhancedDigestEnabled);

    return this.stringToBoolean(parsedShowIfValue);
  }

  private processVariableNodeTypes(node: MailyJSONContent) {
    node.type = 'text'; // set 'variable' to 'text' to for Liquid to recognize it
    node.text = node.attrs?.id || '';
  }

  /**
   * For 'each' node, multiply the content by the number of items in the iterable array
   * and add indexes to the placeholders.
   *
   * @example
   * node:
   * {
   *   type: 'each',
   *   attrs: { each: '{{ payload.comments }}' },
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
    variables: FullPayloadForRender,
    isEnhancedDigestEnabled: boolean
  ): Promise<MailyJSONContent[]> {
    const iterablePath = node.attrs[MailyAttrsEnum.EACH_KEY];
    const forEachNodes = node.content || [];
    const iterableArray = await this.getIterableArray(iterablePath, variables, isEnhancedDigestEnabled);

    return iterableArray.flatMap((_, index) => this.processForEachNodes(forEachNodes, iterablePath, index));
  }

  private async getIterableArray(
    iterablePath: string,
    variables: FullPayloadForRender,
    isEnhancedDigestEnabled: boolean
  ): Promise<unknown[]> {
    const iterableArrayString = await parseLiquid(iterablePath, variables, isEnhancedDigestEnabled);

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

  private processForEachNodes(nodes: MailyJSONContent[], iterablePath: string, index: number): MailyJSONContent[] {
    return nodes.map((node) => {
      const processedNode = { ...node };

      if (isVariableNode(processedNode)) {
        this.processVariableNodeTypes(processedNode);
        if (processedNode.text) {
          processedNode.text = this.addIndexToLiquidExpression(processedNode.text, iterablePath, index);
        }

        return processedNode;
      }

      if (processedNode.content?.length) {
        processedNode.content = this.processForEachNodes(processedNode.content, iterablePath, index);
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
}
