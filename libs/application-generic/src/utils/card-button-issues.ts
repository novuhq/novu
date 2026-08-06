import { JSONContent as MailyJSONContent } from '@novu/maily-render';
import {
  ChatCardButtonFieldName,
  ChatCardButtonIssueCodeEnum,
  ContentIssueEnum,
  getChatCardButtonFieldError,
  RuntimeIssue,
  StepIssueSeverityEnum,
} from '@novu/shared';

/**
 * Blocking validation for Rich Chat link-button fields (`label`, `url`) surfaced as `controls.body`
 * step issues. Walks the stored Maily/TipTap document, validates every `cardButton` node against the
 * shared {@link getChatCardButtonFieldError} rules (label required; url required + valid url format
 * unless the value is a variable), and returns one blocking issue per invalid field.
 *
 * The dashboard Actions bubble runs the same shared validator inline, so the footer and the bubble
 * stay consistent.
 */

const CARD_BUTTON_NODE_TYPE = 'cardButton';

const CODE_TO_ISSUE_TYPE: Record<ChatCardButtonIssueCodeEnum, ContentIssueEnum> = {
  [ChatCardButtonIssueCodeEnum.REQUIRED]: ContentIssueEnum.MISSING_VALUE,
  [ChatCardButtonIssueCodeEnum.INVALID_URL]: ContentIssueEnum.INVALID_URL,
};

function collectCardButtonNodes(node: MailyJSONContent, acc: MailyJSONContent[]): void {
  if (node.type === CARD_BUTTON_NODE_TYPE) {
    acc.push(node);
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      collectCardButtonNodes(child, acc);
    }
  }
}

function readStringAttr(attrs: Record<string, unknown> | undefined, key: string): string {
  const value = attrs?.[key];

  return typeof value === 'string' ? value : '';
}

export function collectCardButtonFieldIssues(doc: MailyJSONContent): RuntimeIssue[] {
  const buttons: MailyJSONContent[] = [];
  collectCardButtonNodes(doc, buttons);

  if (buttons.length === 0) {
    return [];
  }

  // Only disambiguate with a button number when there is more than one button to point at.
  const annotateButton = buttons.length > 1;
  const issues: RuntimeIssue[] = [];

  buttons.forEach((button, index) => {
    const attrs = button.attrs as Record<string, unknown> | undefined;

    const fields: Array<{ field: ChatCardButtonFieldName; value: string; isVariable: boolean }> = [
      { field: 'label', value: readStringAttr(attrs, 'label'), isVariable: attrs?.isLabelVariable === true },
      { field: 'url', value: readStringAttr(attrs, 'url'), isVariable: attrs?.isUrlVariable === true },
    ];

    for (const { field, value, isVariable } of fields) {
      const error = getChatCardButtonFieldError(field, value, isVariable);

      if (!error) {
        continue;
      }

      issues.push({
        issueType: CODE_TO_ISSUE_TYPE[error.code],
        severity: StepIssueSeverityEnum.ERROR,
        message: annotateButton ? `Button ${index + 1}: ${error.message}` : error.message,
      });
    }
  });

  return issues;
}
