import { expect } from 'chai';
import { renderPlanModelAsMarkdown } from './plan-model-to-markdown';
import { PLAN_THINKING_TASK_ID } from './plan-phase';

describe('renderPlanModelAsMarkdown', () => {
  it('renders dynamic title and a single current task', () => {
    const markdown = renderPlanModelAsMarkdown(
      {
        title: 'Running github: search_code…',
        tasks: [{ id: '1', title: 'github: search_code', status: 'in_progress' }],
      },
      'thinking'
    );

    expect(markdown).to.equal('🧠 **Running github: search_code…**\n\n🔄 `github: search_code`');
  });

  it('hides synthetic thinking task', () => {
    const markdown = renderPlanModelAsMarkdown(
      {
        title: 'Running Linear: save_issue…',
        tasks: [
          { id: '1', title: 'Linear: save_issue', status: 'in_progress' },
          { id: PLAN_THINKING_TASK_ID, title: 'Thinking…', status: 'in_progress' },
        ],
      },
      'thinking'
    );

    expect(markdown).to.equal('🧠 **Running Linear: save_issue…**\n\n🔄 `Linear: save_issue`');
  });

  it('uses finished phase title when there are no tasks', () => {
    const markdown = renderPlanModelAsMarkdown({ title: '', tasks: [] }, 'finished');

    expect(markdown).to.equal('✅ **Finished thinking**');
  });

  it('falls back to phase title when plan title is empty', () => {
    const markdown = renderPlanModelAsMarkdown({ title: '', tasks: [] }, 'thinking');

    expect(markdown.trim().length).to.be.greaterThan(0);
    expect(markdown).to.equal('🧠 **Thinking…**');
  });
});
