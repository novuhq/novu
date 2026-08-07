import { JSONContent as MailyJSONContent } from '@novu/maily-render';
import {
  CHAT_CARD_BUTTON_LABEL_REQUIRED_MESSAGE,
  CHAT_CARD_BUTTON_URL_INVALID_MESSAGE,
  CHAT_CARD_BUTTON_URL_REQUIRED_MESSAGE,
  ContentIssueEnum,
  StepIssueSeverityEnum,
} from '@novu/shared';
import { collectCardButtonFieldIssues } from './card-button-issues';

const doc = (...content: MailyJSONContent[]): MailyJSONContent => ({ type: 'doc', content });

const cardActions = (...buttons: MailyJSONContent[]): MailyJSONContent => ({ type: 'cardActions', content: buttons });

const cardButton = (attrs: Record<string, unknown>): MailyJSONContent => ({ type: 'cardButton', attrs });

describe('collectCardButtonFieldIssues', () => {
  it('returns no issues when there are no card buttons', () => {
    expect(collectCardButtonFieldIssues(doc({ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }))).toEqual(
      []
    );
  });

  it('returns no issues for a valid link button', () => {
    const issues = collectCardButtonFieldIssues(
      doc(cardActions(cardButton({ label: 'View', url: 'https://example.com' })))
    );

    expect(issues).toEqual([]);
  });

  it('flags a missing label as a blocking issue', () => {
    const issues = collectCardButtonFieldIssues(
      doc(cardActions(cardButton({ label: '', url: 'https://example.com' })))
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].issueType).toBe(ContentIssueEnum.CHAT_CARD_INVALID_BUTTON);
    expect(issues[0].severity).toBe(StepIssueSeverityEnum.ERROR);
    expect(issues[0].message).toBe(CHAT_CARD_BUTTON_LABEL_REQUIRED_MESSAGE);
  });

  it('flags a missing url as a blocking issue', () => {
    const issues = collectCardButtonFieldIssues(doc(cardActions(cardButton({ label: 'View', url: '' }))));

    expect(issues).toHaveLength(1);
    expect(issues[0].issueType).toBe(ContentIssueEnum.CHAT_CARD_INVALID_BUTTON);
    expect(issues[0].severity).toBe(StepIssueSeverityEnum.ERROR);
    expect(issues[0].message).toBe(CHAT_CARD_BUTTON_URL_REQUIRED_MESSAGE);
  });

  it('flags a malformed url as a blocking issue', () => {
    const issues = collectCardButtonFieldIssues(
      doc(cardActions(cardButton({ label: 'View', url: 'not-a-valid-url' })))
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].issueType).toBe(ContentIssueEnum.CHAT_CARD_INVALID_BUTTON);
    expect(issues[0].severity).toBe(StepIssueSeverityEnum.ERROR);
    expect(issues[0].message).toBe(CHAT_CARD_BUTTON_URL_INVALID_MESSAGE);
  });

  it('accepts {{ }} variable label and url values without url-format checks', () => {
    const issues = collectCardButtonFieldIssues(
      doc(cardActions(cardButton({ label: '{{ payload.label }}', url: '{{ payload.url }}' })))
    );

    expect(issues).toEqual([]);
  });

  it('flags a bare variable path url as invalid (only {{ payload.url }} is a variable)', () => {
    const issues = collectCardButtonFieldIssues(doc(cardActions(cardButton({ label: 'View', url: 'payload.url' }))));

    expect(issues).toHaveLength(1);
    expect(issues[0].issueType).toBe(ContentIssueEnum.CHAT_CARD_INVALID_BUTTON);
    expect(issues[0].message).toBe(CHAT_CARD_BUTTON_URL_INVALID_MESSAGE);
  });

  it('accepts a text + variable url combination', () => {
    const issues = collectCardButtonFieldIssues(
      doc(cardActions(cardButton({ label: 'View', url: 'https://example.com/{{ payload.id }}' })))
    );

    expect(issues).toEqual([]);
  });

  it('annotates issues with the button number when there is more than one button', () => {
    const issues = collectCardButtonFieldIssues(
      doc(
        cardActions(
          cardButton({ label: 'First', url: 'https://example.com' }),
          cardButton({ label: 'Second', url: '' })
        )
      )
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/^Button 2:/);
  });

  it('finds legacy top-level card buttons', () => {
    const issues = collectCardButtonFieldIssues(doc(cardButton({ label: '', url: '' })));

    // A single button (no `Button N:` annotation prefix) with both fields invalid. Note the
    // messages themselves start with "Button" (e.g. "Button label is required."), so match the
    // annotation prefix pattern explicitly rather than a bare "Button" prefix.
    expect(issues).toHaveLength(2);
    expect(issues.every((issue) => !/^Button \d+:/.test(issue.message))).toBe(true);
  });
});
