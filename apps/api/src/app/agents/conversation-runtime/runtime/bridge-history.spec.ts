import type { AgentHistoryEntry } from '@novu/framework';
import { expect } from 'chai';
import { TOOL_OUTPUT_MAX_BYTES } from '../conversation/tool-result-content';
import { capToolResultPreview, shapeBridgeHistory, slimToolDataForBridge } from './bridge-history';

const BIG = 'x'.repeat(10_000);
const CREATED_AT = '2026-01-01T00:00:00.000Z';

function message(content: string): AgentHistoryEntry {
  return { role: 'user', type: 'message', content, createdAt: CREATED_AT };
}

function request(id: string, content = 'Approval required'): AgentHistoryEntry {
  return {
    role: 'agent',
    type: 'tool_approval_request',
    content,
    toolData: { approvalId: `appr_${id}`, toolCallId: `call_${id}` },
    createdAt: CREATED_AT,
  };
}

function decision(id: string): AgentHistoryEntry {
  return {
    role: 'user',
    type: 'tool_approval_decision',
    content: 'Approved',
    toolData: { approvalId: `appr_${id}` },
    createdAt: CREATED_AT,
  };
}

function result(id: string, output = 'ok'): AgentHistoryEntry {
  return {
    role: 'agent',
    type: 'tool_result',
    content: 'Tool result',
    toolData: { toolCallId: `call_${id}`, output },
    createdAt: CREATED_AT,
  };
}

function bytes(entries: AgentHistoryEntry[]): number {
  return Buffer.byteLength(JSON.stringify(entries), 'utf8');
}

function labels(entries: AgentHistoryEntry[]): string[] {
  return entries.map((entry) => `${entry.type}:${entry.toolData?.approvalId ?? entry.toolData?.toolCallId ?? ''}`);
}

describe('shapeBridgeHistory', () => {
  it('returns the history unchanged when it fits the budget', () => {
    const entries = [message('hi'), request('a'), decision('a'), result('a'), message('thanks')];

    const { history, droppedForBudget } = shapeBridgeHistory(entries, 1_000_000);

    expect(history).to.deep.equal(entries);
    expect(droppedForBudget).to.equal(0);
  });

  it('drops the oldest rows first and a spread-out tool cycle as a whole', () => {
    const entries = [
      message(BIG),
      request('a'),
      message(BIG),
      request('b'),
      decision('a'),
      result('b', BIG),
      result('a', BIG),
      message('newest'),
    ];
    const budget = bytes(entries) - 2 * BIG.length;

    const { history, droppedForBudget } = shapeBridgeHistory(entries, budget);

    expect(labels(history)).to.deep.equal([
      'message:',
      'tool_approval_request:appr_b',
      'tool_result:call_b',
      'message:',
    ]);
    expect(history[history.length - 1].content).to.equal('newest');
    expect(droppedForBudget).to.equal(4);
    expect(bytes(history)).to.be.at.most(budget);
  });

  it('fits the serialized array, brackets and commas included, within the budget', () => {
    const entries = Array.from({ length: 40 }, (_, index) => message(`row ${index}`));
    const budget = bytes(entries) - 1;

    const { history } = shapeBridgeHistory(entries, budget);

    expect(history).to.have.length(39);
    expect(bytes(history)).to.be.at.most(budget);
  });

  it('keeps the newest row even when it alone exceeds the budget', () => {
    const entries = [message('older'), request('a'), result('a'), message(BIG)];

    const { history } = shapeBridgeHistory(entries, 1_000);

    expect(history).to.deep.equal([message(BIG)]);
  });

  it('keeps the approval being resumed when its request is the oldest row', () => {
    const entries = [request('a', BIG), message(BIG), message(BIG), decision('a')];

    const { history } = shapeBridgeHistory(entries, BIG.length + 1_000);

    expect(labels(history)).to.deep.equal(['tool_approval_request:appr_a', 'tool_approval_decision:appr_a']);
  });

  it('drops a decision and a result whose request is not in the history', () => {
    const entries = [decision('gone'), result('gone'), message('hi'), request('a'), decision('a'), result('a')];

    const { history, droppedForBudget } = shapeBridgeHistory(entries, 1_000_000);

    expect(labels(history)).to.deep.equal([
      'message:',
      'tool_approval_request:appr_a',
      'tool_approval_decision:appr_a',
      'tool_result:call_a',
    ]);
    expect(droppedForBudget).to.equal(0);
  });
});

describe('capToolResultPreview', () => {
  it('cuts a long tool-result preview to 1KB and leaves a short one alone', () => {
    const capped = capToolResultPreview('é'.repeat(5_000));

    expect(Buffer.byteLength(capped, 'utf8')).to.be.at.most(1024);
    expect(capped).to.match(/\[truncated: tool output exceeded 1024 bytes\]$/);
    expect(capToolResultPreview('Tool result: notion_search')).to.equal('Tool result: notion_search');
  });
});

describe('slimToolDataForBridge', () => {
  it('caps an uncapped stored output and leaves out the dashboard copy', () => {
    const slimmed = slimToolDataForBridge({
      toolCallId: 'call_a',
      output: 'y'.repeat(100_000),
      content: [{ type: 'text', text: 'y'.repeat(60_000) }],
    });

    expect(slimmed).not.to.have.property('content');
    expect(slimmed?.truncated).to.equal(true);
    expect(Buffer.byteLength(String(slimmed?.output), 'utf8')).to.be.at.most(TOOL_OUTPUT_MAX_BYTES);
    expect(String(slimmed?.output)).to.match(/\[truncated: tool output exceeded \d+ bytes\]$/);
  });
});
