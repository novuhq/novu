import { expect } from 'chai';
import { PLAN_THINKING_TASK_ID } from './plan-phase';
import { renderPlanModelAsMarkdown } from './plan-model-to-markdown';

describe('renderPlanModelAsMarkdown', () => {
  it('renders phase title and task statuses', () => {
    const markdown = renderPlanModelAsMarkdown(
      {
        title: 'ignored',
        tasks: [
          { id: '1', title: 'mcp: search', status: 'complete' },
          { id: '2', title: 'Thinking…', status: 'in_progress' },
        ],
      },
      'thinking'
    );

    expect(markdown).to.equal('🧠 **Thinking…**\n\n✅ `mcp: search`\n🔄 `Thinking…`');
  });

  it('hides synthetic thinking task', () => {
    const markdown = renderPlanModelAsMarkdown(
      {
        title: 'ignored',
        tasks: [
          { id: '1', title: 'Linear: save_issue', status: 'complete' },
          { id: PLAN_THINKING_TASK_ID, title: 'Thinking…', status: 'in_progress' },
        ],
      },
      'thinking'
    );

    expect(markdown).to.equal('🧠 **Thinking…**\n\n✅ `Linear: save_issue`');
  });

  it('uses finished phase title and emoji', () => {
    const markdown = renderPlanModelAsMarkdown(
      {
        title: 'ignored',
        tasks: [{ id: '1', title: 'Linear: save_issue', status: 'complete' }],
      },
      'finished'
    );

    expect(markdown).to.equal('✅ **Finished thinking**\n\n✅ `Linear: save_issue`');
  });

  it('never returns empty markdown', () => {
    const markdown = renderPlanModelAsMarkdown({ title: '', tasks: [] }, 'thinking');

    expect(markdown.trim().length).to.be.greaterThan(0);
    expect(markdown).to.equal('🧠 **Thinking…**');
  });
});
